import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

/**
 * Scope types for contribution analysis
 */
type ContributionScope =
  | { type: 'my_contributions' }
  | { type: 'callout'; calloutId: string }
  | { type: 'space'; spaceId: string };

/**
 * Analysis type options
 */
type AnalysisType = 'summary' | 'content' | 'semantic';

interface AnalyzeContributionsArgs {
  scope: string; // 'my_contributions' | 'callout:{id}' | 'space:{id}'
  analysisType?: AnalysisType;
  limit?: number;
  contributionTypes?: string[]; // Filter by type: post, whiteboard, link, memo
}

/**
 * Compact contribution representation for LLM consumption
 */
interface CompactContribution {
  id: string;
  type: CalloutContributionType;
  title?: string;
  description?: string;
  createdBy?: string;
  isMyContribution: boolean;
  createdDate: Date;
  updatedDate: Date;
  // Type-specific content
  content?: {
    // For posts
    postContent?: string;
    commentCount?: number;
    // For whiteboards - semantic analysis
    whiteboardAnalysis?: {
      texts: string[];
      stats: Record<string, unknown>;
      hint?: string;
    };
    // For links
    uri?: string;
    // For memos
    memoContent?: string;
  };
  context?: {
    calloutId?: string;
    calloutName?: string;
    spaceId?: string;
  };
}

/**
 * Tool for analyzing contributions across the platform.
 * Supports filtering by user's own contributions, by callout, or by space.
 * Provides token-optimized output with semantic analysis for whiteboards.
 */
@Injectable()
export class ContributionsAnalyzeTool implements McpTool {
  constructor(
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'analyze_contributions',
      description:
        'Analyze contributions (posts, whiteboards, links, memos) across the platform. ' +
        'Can analyze your own contributions, contributions to a specific callout, or all contributions in a space. ' +
        'Use "semantic" analysis for token-optimized output with whiteboard analysis.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description:
              'Scope of analysis: "my_contributions" for your contributions, ' +
              '"callout:{id}" for a specific callout, "space:{id}" for all contributions in a space',
          },
          analysisType: {
            type: 'string',
            enum: ['summary', 'content', 'semantic'],
            description:
              'Type of analysis: "summary" (counts and stats), "content" (extract text content), ' +
              '"semantic" (token-optimized with whiteboard analysis). Default: summary',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of contributions to analyze (default: 20, max: 50)',
          },
          contributionTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['post', 'whiteboard', 'link', 'memo'],
            },
            description: 'Filter by contribution types. Default: all types',
          },
        },
        required: ['scope'],
      },
    };
  }

  async execute(
    args: unknown,
    agentInfo: ActorContext
  ): Promise<McpToolResult> {
    const {
      scope: scopeString,
      analysisType = 'summary',
      limit = 20,
      contributionTypes,
    } = args as AnalyzeContributionsArgs;

    const effectiveLimit = Math.min(Math.max(1, limit), 50);

    // Parse scope
    const scope = this.parseScope(scopeString);
    if (!scope) {
      return this.errorResult(
        'Invalid scope format. Use "my_contributions", "callout:{id}", or "space:{id}"'
      );
    }

    this.logger.verbose?.(
      `Analyzing contributions: scope=${scopeString}, type=${analysisType}, limit=${effectiveLimit}, user=${agentInfo.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    try {
      // Fetch contributions based on scope
      const contributions = await this.fetchContributions(
        scope,
        agentInfo,
        effectiveLimit,
        contributionTypes
      );

      // Generate analysis based on type
      let result: Record<string, unknown>;

      switch (analysisType) {
        case 'content':
          result = await this.analyzeContent(contributions, agentInfo);
          break;
        case 'semantic':
          result = await this.analyzeSemanticContent(contributions, agentInfo);
          break;
        case 'summary':
        default:
          result = this.generateSummary(contributions, scope, agentInfo);
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
        `Failed to analyze contributions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );

      return this.errorResult(
        error instanceof Error
          ? error.message
          : 'Failed to analyze contributions'
      );
    }
  }

  /**
   * Parse scope string into structured scope object
   */
  private parseScope(scopeString: string): ContributionScope | null {
    if (scopeString === 'my_contributions') {
      return { type: 'my_contributions' };
    }

    if (scopeString.startsWith('callout:')) {
      const calloutId = scopeString.slice(8);
      if (calloutId) {
        return { type: 'callout', calloutId };
      }
    }

    if (scopeString.startsWith('space:')) {
      const spaceId = scopeString.slice(6);
      if (spaceId) {
        return { type: 'space', spaceId };
      }
    }

    return null;
  }

  /**
   * Fetch contributions based on scope with authorization filtering
   */
  private async fetchContributions(
    scope: ContributionScope,
    agentInfo: ActorContext,
    limit: number,
    contributionTypes?: string[]
  ): Promise<CalloutContribution[]> {
    const queryBuilder = this.entityManager
      .getRepository(CalloutContribution)
      .createQueryBuilder('contribution')
      .leftJoinAndSelect('contribution.authorization', 'authorization')
      .leftJoinAndSelect('contribution.post', 'post')
      .leftJoinAndSelect('post.profile', 'postProfile')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('contribution.whiteboard', 'whiteboard')
      .leftJoinAndSelect('whiteboard.profile', 'whiteboardProfile')
      .leftJoinAndSelect('contribution.link', 'link')
      .leftJoinAndSelect('link.profile', 'linkProfile')
      .leftJoinAndSelect('contribution.memo', 'memo')
      .leftJoinAndSelect('memo.profile', 'memoProfile')
      .leftJoinAndSelect('contribution.callout', 'callout')
      .leftJoinAndSelect('callout.framing', 'framing')
      .leftJoinAndSelect('framing.profile', 'framingProfile');

    // Apply scope filter
    switch (scope.type) {
      case 'my_contributions':
        if (!agentInfo.actorID) {
          throw new Error('Must be authenticated to view your contributions');
        }
        queryBuilder.where('contribution.createdBy = :userId', {
          userId: agentInfo.actorID,
        });
        break;

      case 'callout':
        queryBuilder.where('callout.id = :calloutId', {
          calloutId: scope.calloutId,
        });
        break;

      case 'space':
        // Join through collaboration to space
        queryBuilder
          .leftJoin('callout.collaboration', 'collaboration')
          .leftJoin('collaboration.space', 'space')
          .where('space.id = :spaceId', { spaceId: scope.spaceId });
        break;
    }

    // Apply contribution type filter
    if (contributionTypes && contributionTypes.length > 0) {
      const typeMap: Record<string, CalloutContributionType> = {
        post: CalloutContributionType.POST,
        whiteboard: CalloutContributionType.WHITEBOARD,
        link: CalloutContributionType.LINK,
        memo: CalloutContributionType.MEMO,
      };
      const types = contributionTypes
        .map(t => typeMap[t.toLowerCase()])
        .filter(Boolean);
      if (types.length > 0) {
        queryBuilder.andWhere('contribution.type IN (:...types)', { types });
      }
    }

    // Order by most recent
    queryBuilder.orderBy('contribution.updatedDate', 'DESC');

    // Fetch more than limit to account for authorization filtering
    const fetchLimit = limit * 3;
    queryBuilder.take(fetchLimit);

    const allContributions = await queryBuilder.getMany();

    // Filter by authorization
    const authorizedContributions: CalloutContribution[] = [];
    for (const contribution of allContributions) {
      if (authorizedContributions.length >= limit) break;

      if (!contribution.authorization) continue;

      try {
        const hasAccess = this.authorizationService.isAccessGranted(
          agentInfo,
          contribution.authorization,
          AuthorizationPrivilege.READ
        );
        if (hasAccess) {
          authorizedContributions.push(contribution);
        }
      } catch {}
    }

    return authorizedContributions;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(
    contributions: CalloutContribution[],
    scope: ContributionScope,
    agentInfo: ActorContext
  ): Record<string, unknown> {
    const typeCounts: Record<string, number> = {};
    const callouts = new Set<string>();
    let myContributionsCount = 0;

    for (const contrib of contributions) {
      typeCounts[contrib.type] = (typeCounts[contrib.type] || 0) + 1;
      if (contrib.callout?.id) {
        callouts.add(contrib.callout.id);
      }
      if (contrib.createdBy === agentInfo.actorID) {
        myContributionsCount++;
      }
    }

    return {
      scope:
        scope.type === 'my_contributions'
          ? 'my_contributions'
          : scope.type === 'callout'
            ? `callout:${scope.calloutId}`
            : `space:${scope.spaceId}`,
      userId: agentInfo.actorID || 'anonymous',
      summary: {
        totalContributions: contributions.length,
        byType: typeCounts,
        uniqueCallouts: callouts.size,
        myContributions: myContributionsCount,
      },
      recentActivity: contributions.slice(0, 5).map(c => ({
        id: c.id,
        type: c.type,
        title: this.getContributionTitle(c),
        updatedDate: c.updatedDate,
      })),
    };
  }

  /**
   * Analyze content - extract text from all contributions
   */
  private async analyzeContent(
    contributions: CalloutContribution[],
    agentInfo: ActorContext
  ): Promise<Record<string, unknown>> {
    const items: CompactContribution[] = [];

    for (const contrib of contributions) {
      const item = await this.buildCompactContribution(
        contrib,
        agentInfo,
        false
      );
      items.push(item);
    }

    return {
      userId: agentInfo.actorID || 'anonymous',
      totalAnalyzed: items.length,
      contributions: items,
    };
  }

  /**
   * Semantic analysis - token-optimized with whiteboard analysis
   */
  private async analyzeSemanticContent(
    contributions: CalloutContribution[],
    agentInfo: ActorContext
  ): Promise<Record<string, unknown>> {
    const items: CompactContribution[] = [];
    const allTexts: string[] = [];
    const typeCounts: Record<string, number> = {};

    for (const contrib of contributions) {
      const item = await this.buildCompactContribution(
        contrib,
        agentInfo,
        true
      );
      items.push(item);

      // Collect all text for aggregate analysis
      if (item.title) allTexts.push(item.title);
      if (item.description) allTexts.push(item.description);
      if (item.content?.postContent) allTexts.push(item.content.postContent);
      if (item.content?.whiteboardAnalysis?.texts) {
        allTexts.push(...item.content.whiteboardAnalysis.texts);
      }

      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }

    // Generate interpretation hint
    const hint = this.generateHint(typeCounts, items);

    return {
      userId: agentInfo.actorID || 'anonymous',
      stats: {
        totalContributions: items.length,
        byType: typeCounts,
        totalTextPieces: allTexts.length,
      },
      hint,
      // Compact text-only view
      allTexts: allTexts.slice(0, 50), // Limit to reduce tokens
      contributions: items.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        isMyContribution: item.isMyContribution,
        // Include only essential content
        texts: this.extractTextsFromContribution(item),
        context: item.context?.calloutName
          ? { callout: item.context.calloutName }
          : undefined,
      })),
    };
  }

  /**
   * Build compact contribution representation
   */
  private async buildCompactContribution(
    contribution: CalloutContribution,
    agentInfo: ActorContext,
    includeSemanticAnalysis: boolean
  ): Promise<CompactContribution> {
    const item: CompactContribution = {
      id: contribution.id,
      type: contribution.type,
      createdBy: contribution.createdBy,
      isMyContribution: contribution.createdBy === agentInfo.actorID,
      createdDate: contribution.createdDate,
      updatedDate: contribution.updatedDate,
    };

    // Context
    if (contribution.callout) {
      item.context = {
        calloutId: contribution.callout.id,
        calloutName: contribution.callout.framing?.profile?.displayName,
      };
    }

    // Type-specific content
    switch (contribution.type) {
      case CalloutContributionType.POST:
        if (contribution.post) {
          item.title = contribution.post.profile?.displayName;
          item.description = contribution.post.profile?.description;
          item.content = {
            postContent: contribution.post.profile?.description,
            commentCount: contribution.post.comments?.id ? 1 : 0, // Simplified
          };
        }
        break;

      case CalloutContributionType.WHITEBOARD:
        if (contribution.whiteboard) {
          item.title = contribution.whiteboard.profile?.displayName;
          item.description = contribution.whiteboard.profile?.description;

          if (includeSemanticAnalysis && contribution.whiteboard.content) {
            // Perform semantic analysis on whiteboard
            const analysis = this.analyzeWhiteboardContent(
              contribution.whiteboard.content
            );
            item.content = {
              whiteboardAnalysis: analysis,
            };
          }
        }
        break;

      case CalloutContributionType.LINK:
        if (contribution.link) {
          item.title = contribution.link.profile?.displayName;
          item.description = contribution.link.profile?.description;
          item.content = {
            uri: contribution.link.uri,
          };
        }
        break;

      case CalloutContributionType.MEMO:
        if (contribution.memo) {
          item.title = contribution.memo.profile?.displayName;
          item.description = contribution.memo.profile?.description;
          if (contribution.memo.content) {
            // Memo content is stored as Buffer
            item.content = {
              memoContent: contribution.memo.content
                .toString('utf-8')
                .slice(0, 500),
            };
          }
        }
        break;
    }

    return item;
  }

  /**
   * Analyze whiteboard content - reuse semantic analysis logic
   */
  private analyzeWhiteboardContent(contentString: string): {
    texts: string[];
    stats: Record<string, unknown>;
    hint?: string;
  } {
    try {
      const content = JSON.parse(contentString);
      const elements =
        (content.elements as Array<Record<string, unknown>>) || [];

      // Extract texts
      const texts: string[] = [];
      const typeCounts: Record<string, number> = {};

      for (const el of elements) {
        const type = el.type as string;
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (type === 'text' && el.text) {
          const text = String(el.text).trim();
          if (text) texts.push(text);
        }
      }

      // Count connections
      const arrows = elements.filter(
        el => el.type === 'arrow' && el.startBinding && el.endBinding
      );

      // Generate hint
      const hints: string[] = [];
      if (arrows.length > 2) hints.push('connected diagram');
      if (typeCounts['rectangle'] > 3) hints.push('structured layout');
      if (texts.length > 10) hints.push('text-heavy');

      return {
        texts: texts.slice(0, 20), // Limit for token efficiency
        stats: {
          elements: elements.length,
          types: typeCounts,
          textCount: texts.length,
          connections: arrows.length,
        },
        hint: hints.length > 0 ? hints.join(', ') : 'visual content',
      };
    } catch {
      return {
        texts: [],
        stats: { error: 'Failed to parse whiteboard content' },
      };
    }
  }

  /**
   * Extract texts from a compact contribution
   */
  private extractTextsFromContribution(item: CompactContribution): string[] {
    const texts: string[] = [];
    if (item.title) texts.push(item.title);
    if (item.content?.postContent) texts.push(item.content.postContent);
    if (item.content?.whiteboardAnalysis?.texts) {
      texts.push(...item.content.whiteboardAnalysis.texts.slice(0, 5));
    }
    if (item.content?.memoContent)
      texts.push(item.content.memoContent.slice(0, 200));
    return texts;
  }

  /**
   * Get title from contribution
   */
  private getContributionTitle(contribution: CalloutContribution): string {
    switch (contribution.type) {
      case CalloutContributionType.POST:
        return contribution.post?.profile?.displayName || 'Untitled Post';
      case CalloutContributionType.WHITEBOARD:
        return (
          contribution.whiteboard?.profile?.displayName || 'Untitled Whiteboard'
        );
      case CalloutContributionType.LINK:
        return contribution.link?.profile?.displayName || 'Untitled Link';
      case CalloutContributionType.MEMO:
        return contribution.memo?.profile?.displayName || 'Untitled Memo';
      default:
        return 'Unknown';
    }
  }

  /**
   * Generate interpretation hint
   */
  private generateHint(
    typeCounts: Record<string, number>,
    items: CompactContribution[]
  ): string {
    const hints: string[] = [];

    if (typeCounts[CalloutContributionType.POST] > 0) {
      hints.push(`${typeCounts[CalloutContributionType.POST]} posts`);
    }
    if (typeCounts[CalloutContributionType.WHITEBOARD] > 0) {
      hints.push(
        `${typeCounts[CalloutContributionType.WHITEBOARD]} whiteboards`
      );
    }
    if (typeCounts[CalloutContributionType.LINK] > 0) {
      hints.push(`${typeCounts[CalloutContributionType.LINK]} links`);
    }
    if (typeCounts[CalloutContributionType.MEMO] > 0) {
      hints.push(`${typeCounts[CalloutContributionType.MEMO]} memos`);
    }

    const myContributions = items.filter(i => i.isMyContribution).length;
    if (myContributions > 0) {
      hints.push(`${myContributions} by you`);
    }

    return hints.join(', ') || 'no contributions found';
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
