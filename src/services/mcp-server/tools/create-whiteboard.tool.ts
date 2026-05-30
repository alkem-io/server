import { LogContext } from '@common/enums';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { CalloutResolverMutations } from '@domain/collaboration/callout/callout.resolver.mutations';
import { CreateContributionOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.contribution';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface CreateWhiteboardArgs {
  calloutId: string;
  displayName: string;
  content?: string;
}

/**
 * Tool for creating a whiteboard on a callout. This is the MCP server's first
 * write/mutation tool: the AI client generates the Excalidraw scene JSON and
 * this tool persists it as a WHITEBOARD contribution.
 *
 * Authorization mirrors the GraphQL mutation exactly — the work is delegated to
 * `CalloutResolverMutations.createContributionOnCallout`, which enforces the
 * `CONTRIBUTE` privilege on the target callout and runs the full contribution
 * orchestration (save → content materialization → authorization-policy
 * application → events). So an actor can only create a whiteboard where they
 * could create one through the normal API.
 */
@Injectable()
export class CreateWhiteboardTool implements McpTool {
  constructor(
    private readonly calloutResolverMutations: CalloutResolverMutations,
    @InjectRepository(CalloutContribution)
    private readonly contributionRepository: Repository<CalloutContribution>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'create_whiteboard',
      description:
        'Create a whiteboard on a callout. Provide the Excalidraw scene as JSON in "content" ' +
        '(you generate the scene; this tool persists it). Requires CONTRIBUTE access to the ' +
        'target callout, and the callout must allow whiteboard contributions. ' +
        'Use list_whiteboards / a callout id to pick the target. ' +
        'The content must be a valid Excalidraw scene object: {"type":"excalidraw","version":2,"elements":[...],"appState":{...}}.',
      inputSchema: {
        type: 'object',
        properties: {
          calloutId: {
            type: 'string',
            description:
              'The ID of the callout to create the whiteboard on. The callout must allow whiteboard contributions.',
          },
          displayName: {
            type: 'string',
            description: 'The display name (title) for the new whiteboard.',
          },
          content: {
            type: 'string',
            description:
              'The whiteboard content as an Excalidraw scene JSON string. Optional — omit for an empty whiteboard.',
          },
        },
        required: ['calloutId', 'displayName'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { calloutId, displayName, content } = args as CreateWhiteboardArgs;

    if (!calloutId || !displayName) {
      return this.errorResult(
        'Both "calloutId" and "displayName" are required.'
      );
    }

    // Validate content is parseable JSON before persisting (the GraphQL scalar
    // would do this on the normal path; we call the resolver directly).
    if (content !== undefined && content !== '') {
      try {
        JSON.parse(content);
      } catch {
        return this.errorResult(
          'The "content" is not valid JSON. Provide a valid Excalidraw scene JSON string.'
        );
      }
    }

    this.logger.verbose?.(
      `create_whiteboard: callout=${calloutId}, name="${displayName}", actor=${actorContext.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    const input: CreateContributionOnCalloutInput = {
      calloutID: calloutId,
      type: CalloutContributionType.WHITEBOARD,
      whiteboard: {
        profile: { displayName },
        ...(content ? { content } : {}),
      },
    } as CreateContributionOnCalloutInput;

    try {
      // Delegates auth (CONTRIBUTE) + full orchestration to the same path the
      // GraphQL mutation uses.
      const contribution =
        await this.calloutResolverMutations.createContributionOnCallout(
          actorContext,
          input
        );

      // The resolver's return value doesn't eager-load the whiteboard relation,
      // so reload it to surface the new whiteboard's id/name to the caller.
      const reloaded = await this.contributionRepository.findOne({
        where: { id: contribution.id },
        relations: { whiteboard: { profile: true } },
      });
      const whiteboard = reloaded?.whiteboard ?? contribution.whiteboard;
      const result = {
        created: true,
        calloutId,
        contributionId: contribution.id,
        whiteboard: whiteboard
          ? {
              id: whiteboard.id,
              nameID: whiteboard.nameID,
              displayName: whiteboard.profile?.displayName ?? displayName,
              uri: `alkemio://whiteboards/${whiteboard.id}`,
            }
          : null,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      this.logger.warn?.(
        `create_whiteboard failed for callout ${calloutId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Could not create whiteboard: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
