import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface ListWhiteboardsArgs {
  filter?: 'my_contributions' | 'all_accessible';
  limit?: number;
  sortBy?: 'recent' | 'oldest' | 'name';
}

interface WhiteboardListItem {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  isMyContribution: boolean;
  updatedDate: Date;
  createdDate: Date;
  uri: string;
  context?: {
    calloutId?: string;
    spaceId?: string;
  };
}

/**
 * Tool for listing and discovering whiteboards the user has access to.
 * Enables AI clients to find whiteboards before analyzing them.
 */
@Injectable()
export class WhiteboardListTool implements McpTool {
  constructor(
    @InjectRepository(Whiteboard)
    private readonly whiteboardRepository: Repository<Whiteboard>,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'list_whiteboards',
      description:
        'List and discover whiteboards you have access to. Use this to find whiteboards before analyzing them. ' +
        'Can filter by your contributions or show all accessible whiteboards.',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['my_contributions', 'all_accessible'],
            description:
              'Filter whiteboards: "my_contributions" shows only whiteboards you created/contributed to, ' +
              '"all_accessible" shows all whiteboards you can read (default: all_accessible)',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of whiteboards to return (default: 20, max: 100)',
          },
          sortBy: {
            type: 'string',
            enum: ['recent', 'oldest', 'name'],
            description:
              'Sort order: "recent" (newest first), "oldest", or "name" (alphabetical). Default: recent',
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
      filter = 'all_accessible',
      limit = 20,
      sortBy = 'recent',
    } = args as ListWhiteboardsArgs;

    const effectiveLimit = Math.min(Math.max(1, limit), 100);

    this.logger.verbose?.(
      `Listing whiteboards for user ${agentInfo.actorID || 'anonymous'}, filter: ${filter}, limit: ${effectiveLimit}, isAnonymous: ${agentInfo.isAnonymous}, credentials: ${agentInfo.credentials?.length || 0}`,
      LogContext.MCP_SERVER
    );

    try {
      // Build query with necessary relations
      const queryBuilder = this.whiteboardRepository
        .createQueryBuilder('whiteboard')
        .leftJoinAndSelect('whiteboard.authorization', 'authorization')
        .leftJoinAndSelect('whiteboard.profile', 'profile')
        .leftJoin('whiteboard.contribution', 'contribution')
        .leftJoin('contribution.callout', 'callout')
        .leftJoin('whiteboard.framing', 'framing')
        .leftJoin('framing.callout', 'framingCallout')
        .addSelect([
          'contribution.id',
          'callout.id',
          'framing.id',
          'framingCallout.id',
        ]);

      // Apply filter for user's contributions
      if (filter === 'my_contributions' && agentInfo.actorID) {
        queryBuilder.where('whiteboard.createdBy = :userId', {
          userId: agentInfo.actorID,
        });
      }

      // Apply sorting
      switch (sortBy) {
        case 'oldest':
          queryBuilder.orderBy('whiteboard.updatedDate', 'ASC');
          break;
        case 'name':
          queryBuilder.orderBy('profile.displayName', 'ASC');
          break;
        case 'recent':
        default:
          queryBuilder.orderBy('whiteboard.updatedDate', 'DESC');
          break;
      }

      // Fetch more than limit to account for authorization filtering
      const fetchLimit = effectiveLimit * 3;
      queryBuilder.take(fetchLimit);

      const whiteboards = await queryBuilder.getMany();

      // Filter by authorization and build results
      const results: WhiteboardListItem[] = [];

      for (const whiteboard of whiteboards) {
        if (results.length >= effectiveLimit) {
          break;
        }

        // Check read authorization
        if (!whiteboard.authorization) {
          continue;
        }

        try {
          const hasAccess = this.authorizationService.isAccessGranted(
            agentInfo,
            whiteboard.authorization,
            AuthorizationPrivilege.READ
          );

          if (!hasAccess) {
            continue;
          }
        } catch {
          // No access
          continue;
        }

        // Build context info
        const context: WhiteboardListItem['context'] = {};
        if (whiteboard.contribution?.callout) {
          context.calloutId = whiteboard.contribution.callout.id;
        } else if (whiteboard.framing?.callout) {
          context.calloutId = whiteboard.framing.callout.id;
        }

        results.push({
          id: whiteboard.id,
          name: whiteboard.profile?.displayName || 'Untitled Whiteboard',
          description: whiteboard.profile?.description || undefined,
          createdBy: whiteboard.createdBy,
          isMyContribution: whiteboard.createdBy === agentInfo.actorID,
          updatedDate: whiteboard.updatedDate,
          createdDate: whiteboard.createdDate,
          uri: `alkemio://whiteboards/${whiteboard.id}`,
          context: Object.keys(context).length > 0 ? context : undefined,
        });
      }

      // Summary info
      const summary = {
        totalFound: results.length,
        filter,
        sortBy,
        userId: agentInfo.actorID || 'anonymous',
        hasMore: whiteboards.length >= fetchLimit,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                summary,
                whiteboards: results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error?.(
        `Failed to list whiteboards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to list whiteboards',
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  }
}
