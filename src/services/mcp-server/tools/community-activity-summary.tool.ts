import { LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IActivity } from '@platform/activity';
import { ActivityService } from '@platform/activity/activity.service';
import {
  CredentialMap,
  groupCredentialsByEntity,
} from '@services/api/roles/util/group.credentials.by.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

/**
 * Analysis type options
 */
type AnalysisType = 'summary' | 'detailed' | 'semantic';

interface CommunityActivitySummaryArgs {
  analysisType?: AnalysisType;
  limit?: number;
  types?: string[];
  daysBack?: number;
}

/**
 * Compact activity representation for LLM consumption
 */
interface CompactActivity {
  id: string;
  type: ActivityEventType;
  description?: string;
  triggeredBy: string;
  isMyActivity: boolean;
  createdDate: Date;
  spaceName?: string;
  spaceId?: string;
}

/**
 * Space activity summary
 */
interface SpaceActivitySummary {
  spaceId: string;
  spaceName?: string;
  role?: string;
  activityCount: number;
  myActivityCount: number;
  recentActivityTypes: Record<string, number>;
  mostRecentActivity?: Date;
  topContributors?: Array<{ userId: string; count: number }>;
}

/**
 * Tool for generating a summary of activity across communities the user is part of.
 * Provides insights into recent activity, participation patterns, and engagement.
 */
@Injectable()
export class CommunityActivitySummaryTool implements McpTool {
  constructor(
    private readonly activityService: ActivityService,
    private readonly spaceLookupService: SpaceLookupService,
    private readonly collaborationService: CollaborationService,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'community_activity_summary',
      description:
        'Generate a summary of recent activity across communities (spaces) you are a member of. ' +
        'Shows participation patterns, recent contributions, and engagement metrics. ' +
        'Use "semantic" analysis for token-optimized output suitable for LLM processing.',
      inputSchema: {
        type: 'object',
        properties: {
          analysisType: {
            type: 'string',
            enum: ['summary', 'detailed', 'semantic'],
            description:
              'Type of analysis: "summary" (overview stats per space), ' +
              '"detailed" (individual activities listed), ' +
              '"semantic" (token-optimized with aggregated insights). Default: summary',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of activities to analyze per space (default: 20, max: 100)',
          },
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'post-created',
                'post-comment',
                'whiteboard-created',
                'whiteboard-content-modified',
                'member-joined',
                'subspace-created',
                'update-sent',
                'callout-published',
                'discussion-comment',
                'callout-link-added',
                'memo-created',
                'calendar-event-created',
              ],
            },
            description:
              'Filter by activity types. Default: all types. Use to focus on specific activity categories.',
          },
          daysBack: {
            type: 'number',
            description:
              'Number of days to look back for activity (default: 30, max: 365)',
          },
        },
      },
    };
  }

  async execute(
    args: unknown,
    agentInfo: ActorContext
  ): Promise<McpToolResult> {
    const {
      analysisType = 'summary',
      limit = 20,
      types,
      daysBack = 30,
    } = args as CommunityActivitySummaryArgs;

    if (!agentInfo.actorID) {
      return this.errorResult(
        'Authentication required. You must be logged in to view community activity.'
      );
    }

    const effectiveLimit = Math.min(Math.max(1, limit), 100);
    const effectiveDaysBack = Math.min(Math.max(1, daysBack), 365);

    this.logger.verbose?.(
      `Generating community activity summary: type=${analysisType}, limit=${effectiveLimit}, daysBack=${effectiveDaysBack}, user=${agentInfo.actorID}`,
      LogContext.MCP_SERVER
    );

    try {
      // Get spaces the user is a member of
      const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
      const userSpaces = await this.getAuthorizedSpaces(
        agentInfo,
        credentialMap
      );

      if (userSpaces.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'You are not a member of any communities yet.',
                hint: 'Join spaces to see activity summaries.',
              }),
            },
          ],
        };
      }

      // Parse activity type filter
      const activityTypes = this.parseActivityTypes(types);

      // Fetch activities for all user spaces
      const activitiesBySpace = await this.fetchActivitiesForSpaces(
        userSpaces,
        agentInfo,
        effectiveLimit,
        activityTypes,
        effectiveDaysBack
      );

      // Generate analysis based on type
      let result: Record<string, unknown>;

      switch (analysisType) {
        case 'detailed':
          result = this.generateDetailedAnalysis(
            activitiesBySpace,
            agentInfo,
            credentialMap
          );
          break;
        case 'semantic':
          result = this.generateSemanticAnalysis(
            activitiesBySpace,
            agentInfo,
            credentialMap
          );
          break;
        case 'summary':
        default:
          result = this.generateSummaryAnalysis(
            activitiesBySpace,
            agentInfo,
            credentialMap
          );
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error?.(
        `Failed to generate community activity summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );

      return this.errorResult(
        error instanceof Error
          ? error.message
          : 'Failed to generate activity summary'
      );
    }
  }

  /**
   * Get spaces the user has credentials for and can read
   */
  private async getAuthorizedSpaces(
    agentInfo: ActorContext,
    credentialMap: CredentialMap
  ): Promise<
    Array<{ spaceId: string; spaceName?: string; collaborationId: string }>
  > {
    const spacesMap = credentialMap.get('spaces');
    if (!spacesMap) return [];

    const spaceIds = Array.from(spacesMap.keys());
    const authorizedSpaces: Array<{
      spaceId: string;
      spaceName?: string;
      collaborationId: string;
    }> = [];

    for (const spaceId of spaceIds) {
      try {
        // Verify space exists and get collaboration
        const collaboration =
          await this.spaceLookupService.getCollaborationOrFail(spaceId);

        // Check read access
        const hasAccess = this.authorizationService.isAccessGranted(
          agentInfo,
          collaboration.authorization,
          AuthorizationPrivilege.READ
        );

        if (hasAccess) {
          // Get space with about.profile for display name
          const space = await this.spaceLookupService.getSpaceOrFail(spaceId, {
            relations: {
              about: {
                profile: true,
              },
            },
          });

          authorizedSpaces.push({
            spaceId,
            spaceName: space.about?.profile?.displayName || space.nameID,
            collaborationId: collaboration.id,
          });
        }
      } catch {}
    }

    return authorizedSpaces;
  }

  /**
   * Parse activity type strings to ActivityEventType enum values
   */
  private parseActivityTypes(
    types?: string[]
  ): ActivityEventType[] | undefined {
    if (!types || types.length === 0) return undefined;

    const typeMap: Record<string, ActivityEventType> = {
      'post-created': ActivityEventType.CALLOUT_POST_CREATED,
      'post-comment': ActivityEventType.CALLOUT_POST_COMMENT,
      'whiteboard-created': ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
      'whiteboard-content-modified':
        ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED,
      'member-joined': ActivityEventType.MEMBER_JOINED,
      'subspace-created': ActivityEventType.SUBSPACE_CREATED,
      'update-sent': ActivityEventType.UPDATE_SENT,
      'callout-published': ActivityEventType.CALLOUT_PUBLISHED,
      'discussion-comment': ActivityEventType.DISCUSSION_COMMENT,
      'callout-link-added': ActivityEventType.CALLOUT_LINK_CREATED,
      'memo-created': ActivityEventType.CALLOUT_MEMO_CREATED,
      'calendar-event-created': ActivityEventType.CALENDAR_EVENT_CREATED,
    };

    return types
      .map(t => typeMap[t.toLowerCase()])
      .filter((t): t is ActivityEventType => !!t);
  }

  /**
   * Fetch activities for all user spaces
   */
  private async fetchActivitiesForSpaces(
    spaces: Array<{
      spaceId: string;
      spaceName?: string;
      collaborationId: string;
    }>,
    agentInfo: ActorContext,
    limit: number,
    types?: ActivityEventType[],
    daysBack = 30
  ): Promise<
    Map<
      string,
      {
        spaceName?: string;
        spaceId: string;
        activities: IActivity[];
      }
    >
  > {
    const result = new Map<
      string,
      { spaceName?: string; spaceId: string; activities: IActivity[] }
    >();

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    for (const space of spaces) {
      try {
        // Get all collaborations (parent + children) for this space
        const collaborationIds = [space.collaborationId];

        try {
          const childCollaborations =
            await this.collaborationService.getChildCollaborationsOrFail(
              space.collaborationId
            );

          for (const child of childCollaborations) {
            const hasAccess = this.authorizationService.isAccessGranted(
              agentInfo,
              child.authorization,
              AuthorizationPrivilege.READ
            );
            if (hasAccess) {
              collaborationIds.push(child.id);
            }
          }
        } catch {
          // No child collaborations or no access
        }

        // Fetch activities
        const activities =
          await this.activityService.getActivityForCollaborations(
            collaborationIds,
            {
              types,
              limit,
              visibility: true,
            }
          );

        // Filter by date
        const filteredActivities = activities.filter(
          a => a.createdDate >= cutoffDate
        );

        result.set(space.spaceId, {
          spaceName: space.spaceName,
          spaceId: space.spaceId,
          activities: filteredActivities,
        });
      } catch (error) {
        this.logger.warn?.(
          `Failed to fetch activities for space ${space.spaceId}: ${error instanceof Error ? error.message : 'Unknown'}`,
          LogContext.MCP_SERVER
        );
      }
    }

    return result;
  }

  /**
   * Generate summary analysis - high-level stats per space
   */
  private generateSummaryAnalysis(
    activitiesBySpace: Map<
      string,
      { spaceName?: string; spaceId: string; activities: IActivity[] }
    >,
    agentInfo: ActorContext,
    credentialMap: CredentialMap
  ): Record<string, unknown> {
    const spaceSummaries: SpaceActivitySummary[] = [];
    let totalActivities = 0;
    let myTotalActivities = 0;
    const globalTypeCounts: Record<string, number> = {};

    for (const [spaceId, data] of activitiesBySpace) {
      const { spaceName, activities } = data;

      // Get user's role in this space
      const spaceRoles = credentialMap.get('spaces')?.get(spaceId) || [];
      const primaryRole = spaceRoles[0]?.toString();

      // Calculate stats
      const typeCounts: Record<string, number> = {};
      let myActivityCount = 0;
      const contributorCounts = new Map<string, number>();
      let mostRecentActivity: Date | undefined;

      for (const activity of activities) {
        // Type counts
        typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;
        globalTypeCounts[activity.type] =
          (globalTypeCounts[activity.type] || 0) + 1;

        // My activities
        if (activity.triggeredBy === agentInfo.actorID) {
          myActivityCount++;
          myTotalActivities++;
        }

        // Contributor tracking
        if (activity.triggeredBy) {
          contributorCounts.set(
            activity.triggeredBy,
            (contributorCounts.get(activity.triggeredBy) || 0) + 1
          );
        }

        // Most recent
        if (!mostRecentActivity || activity.createdDate > mostRecentActivity) {
          mostRecentActivity = activity.createdDate;
        }
      }

      totalActivities += activities.length;

      // Top contributors (top 3)
      const topContributors = Array.from(contributorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([userId, count]) => ({ userId, count }));

      spaceSummaries.push({
        spaceId,
        spaceName,
        role: primaryRole,
        activityCount: activities.length,
        myActivityCount,
        recentActivityTypes: typeCounts,
        mostRecentActivity,
        topContributors:
          topContributors.length > 0 ? topContributors : undefined,
      });
    }

    // Sort by activity count
    spaceSummaries.sort((a, b) => b.activityCount - a.activityCount);

    return {
      userId: agentInfo.actorID,
      totalSpaces: activitiesBySpace.size,
      summary: {
        totalActivities,
        myActivities: myTotalActivities,
        byType: globalTypeCounts,
      },
      spaces: spaceSummaries,
      hint: this.generateSummaryHint(
        spaceSummaries,
        myTotalActivities,
        totalActivities
      ),
    };
  }

  /**
   * Generate detailed analysis - list individual activities
   */
  private generateDetailedAnalysis(
    activitiesBySpace: Map<
      string,
      { spaceName?: string; spaceId: string; activities: IActivity[] }
    >,
    agentInfo: ActorContext,
    credentialMap: CredentialMap
  ): Record<string, unknown> {
    const allActivities: CompactActivity[] = [];

    for (const [spaceId, data] of activitiesBySpace) {
      const { spaceName, activities } = data;

      for (const activity of activities) {
        allActivities.push({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          triggeredBy: activity.triggeredBy,
          isMyActivity: activity.triggeredBy === agentInfo.actorID,
          createdDate: activity.createdDate,
          spaceName,
          spaceId,
        });
      }
    }

    // Sort by date (most recent first)
    allActivities.sort(
      (a, b) => b.createdDate.getTime() - a.createdDate.getTime()
    );

    // Group by space for structured output
    const bySpace: Record<string, CompactActivity[]> = {};
    for (const activity of allActivities) {
      const key = activity.spaceName || activity.spaceId || 'unknown';
      if (!bySpace[key]) bySpace[key] = [];
      bySpace[key].push(activity);
    }

    return {
      userId: agentInfo.actorID,
      totalSpaces: activitiesBySpace.size,
      totalActivities: allActivities.length,
      recentActivities: allActivities.slice(0, 50), // Most recent 50
      activitiesBySpace: bySpace,
    };
  }

  /**
   * Generate semantic analysis - token-optimized for LLM consumption
   */
  private generateSemanticAnalysis(
    activitiesBySpace: Map<
      string,
      { spaceName?: string; spaceId: string; activities: IActivity[] }
    >,
    agentInfo: ActorContext,
    credentialMap: CredentialMap
  ): Record<string, unknown> {
    const spaceSummaries: Array<{
      name: string;
      role?: string;
      stats: { total: number; mine: number };
      types: string[];
      recentDescriptions: string[];
      lastActive?: string;
    }> = [];

    let totalActivities = 0;
    let myActivities = 0;
    const allDescriptions: string[] = [];
    const globalTypes = new Set<string>();

    for (const [spaceId, data] of activitiesBySpace) {
      const { spaceName, activities } = data;

      const spaceRoles = credentialMap.get('spaces')?.get(spaceId) || [];
      const primaryRole = spaceRoles[0]?.toString();

      const typeSet = new Set<string>();
      let myCount = 0;
      const descriptions: string[] = [];

      for (const activity of activities) {
        typeSet.add(activity.type);
        globalTypes.add(activity.type);

        if (activity.triggeredBy === agentInfo.actorID) {
          myCount++;
          myActivities++;
        }

        if (activity.description) {
          descriptions.push(activity.description);
          allDescriptions.push(activity.description);
        }
      }

      totalActivities += activities.length;

      // Find most recent
      const sorted = [...activities].sort(
        (a, b) => b.createdDate.getTime() - a.createdDate.getTime()
      );
      const lastActive = sorted[0]?.createdDate;

      spaceSummaries.push({
        name: spaceName || spaceId,
        role: primaryRole,
        stats: {
          total: activities.length,
          mine: myCount,
        },
        types: Array.from(typeSet),
        recentDescriptions: descriptions.slice(0, 5),
        lastActive: lastActive?.toISOString().split('T')[0],
      });
    }

    // Sort by total activity
    spaceSummaries.sort((a, b) => b.stats.total - a.stats.total);

    // Generate interpretation hints
    const hints = this.generateSemanticHints(
      spaceSummaries,
      myActivities,
      totalActivities,
      globalTypes
    );

    return {
      stats: {
        spaces: activitiesBySpace.size,
        totalActivities,
        myActivities,
        activityTypes: Array.from(globalTypes),
      },
      interpretation: hints,
      spaces: spaceSummaries.map(s => ({
        name: s.name,
        role: s.role,
        activity: `${s.stats.total} total, ${s.stats.mine} by you`,
        types: s.types.join(', '),
        lastActive: s.lastActive,
        samples: s.recentDescriptions.slice(0, 3),
      })),
      // Aggregated descriptions for context (limited for tokens)
      recentHighlights: allDescriptions.slice(0, 20),
    };
  }

  /**
   * Generate summary interpretation hint
   */
  private generateSummaryHint(
    spaceSummaries: SpaceActivitySummary[],
    myActivities: number,
    totalActivities: number
  ): string {
    const hints: string[] = [];

    // Engagement level
    if (totalActivities === 0) {
      hints.push('No recent activity in your communities');
    } else {
      const engagementRatio =
        totalActivities > 0 ? myActivities / totalActivities : 0;
      if (engagementRatio > 0.3) {
        hints.push('You are highly active in your communities');
      } else if (engagementRatio > 0.1) {
        hints.push('You have moderate engagement in your communities');
      } else if (myActivities > 0) {
        hints.push('You have some participation in your communities');
      } else {
        hints.push(
          'Communities are active but you have not contributed recently'
        );
      }
    }

    // Most active space
    if (spaceSummaries.length > 0 && spaceSummaries[0].activityCount > 0) {
      hints.push(
        `Most active: ${spaceSummaries[0].spaceName || 'Unknown'} (${spaceSummaries[0].activityCount} activities)`
      );
    }

    return hints.join('. ');
  }

  /**
   * Generate semantic interpretation hints for LLM
   */
  private generateSemanticHints(
    spaceSummaries: Array<{
      name: string;
      stats: { total: number; mine: number };
    }>,
    myActivities: number,
    totalActivities: number,
    types: Set<string>
  ): string[] {
    const hints: string[] = [];

    // Overall engagement
    const participation =
      totalActivities > 0
        ? Math.round((myActivities / totalActivities) * 100)
        : 0;
    hints.push(`Your participation rate: ${participation}%`);

    // Activity distribution
    if (spaceSummaries.length > 1) {
      const topSpace = spaceSummaries[0];
      const otherActivities = totalActivities - topSpace.stats.total;
      if (topSpace.stats.total > otherActivities) {
        hints.push(`Activity concentrated in ${topSpace.name}`);
      } else {
        hints.push('Activity distributed across multiple spaces');
      }
    }

    // Content types
    if (types.has(ActivityEventType.CALLOUT_POST_CREATED)) {
      hints.push('Includes post creation activity');
    }
    if (types.has(ActivityEventType.CALLOUT_WHITEBOARD_CREATED)) {
      hints.push('Includes collaborative whiteboard activity');
    }
    if (types.has(ActivityEventType.MEMBER_JOINED)) {
      hints.push('New members joining communities');
    }

    return hints;
  }

  /**
   * Create error result
   */
  private errorResult(message: string): McpToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
}
