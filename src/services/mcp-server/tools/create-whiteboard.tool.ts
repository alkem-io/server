import { LogContext } from '@common/enums';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutResolverMutations } from '@domain/collaboration/callout/callout.resolver.mutations';
import { CreateContributionOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.contribution';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { TemplateService } from '@domain/template/template/template.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import { resolveTemplateWhiteboardId } from './whiteboard-template-source';

interface CreateWhiteboardArgs {
  calloutId: string;
  displayName: string;
  /**
   * A whiteboard TEMPLATE id to fill the new board with. The server copies that
   * template's stored Yjs-V2 snapshot into the new board (`sourceWhiteboardID`) —
   * one content representation, never a scene through the model. Omit for a blank
   * board.
   */
  fromTemplateId?: string;
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
    private readonly urlGeneratorService: UrlGeneratorService,
    private readonly templateService: TemplateService,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'create_whiteboard',
      description:
        'Create a whiteboard on a callout. Omit "fromTemplateId" for a BLANK board; set it to a ' +
        'whiteboard TEMPLATE id to fill the new board from that template — the server copies the ' +
        "template's stored content server-side, so you must NOT generate or paste any scene JSON. " +
        'There is no raw-content input: edit a board through edit_whiteboard_elements after it ' +
        'exists. Requires CONTRIBUTE access to the target callout, and the callout must allow ' +
        'whiteboard contributions. Use list_whiteboards / a callout id to pick the target.',
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
          fromTemplateId: {
            type: 'string',
            description:
              'Optional whiteboard TEMPLATE id to fill the new board from. The server copies that ' +
              "template's stored content — do not pass any scene yourself. Omit for a blank board.",
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
    const { calloutId, displayName, fromTemplateId } =
      args as CreateWhiteboardArgs;

    if (!calloutId || !displayName) {
      return this.errorResult(
        'Both "calloutId" and "displayName" are required.'
      );
    }

    // A template fills the new board by COPYING the template whiteboard's stored
    // Yjs-V2 snapshot server-side (sourceWhiteboardID) — one content representation,
    // never a scene through the model.
    let sourceWhiteboardID: string | undefined;
    if (fromTemplateId) {
      const resolved = await resolveTemplateWhiteboardId(
        this.templateService,
        this.authorizationService,
        fromTemplateId,
        actorContext
      );
      if ('error' in resolved) {
        return this.errorResult(resolved.error);
      }
      sourceWhiteboardID = resolved.whiteboardId;
    }

    this.logger.verbose?.(
      `create_whiteboard: callout=${calloutId}, name="${displayName}", actor=${actorContext.actorID || 'anonymous'}${fromTemplateId ? `, fromTemplate=${fromTemplateId}` : ''}`,
      LogContext.MCP_SERVER
    );

    const input: CreateContributionOnCalloutInput = {
      calloutID: calloutId,
      type: CalloutContributionType.WHITEBOARD,
      whiteboard: {
        profile: { displayName },
        ...(sourceWhiteboardID ? { sourceWhiteboardID } : {}),
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
      // Real, browser-openable web URL via the platform's own UrlGeneratorService.
      // Best-effort: omit the link if it cannot be resolved rather than failing.
      let url: string | undefined;
      if (whiteboard) {
        try {
          url = await this.urlGeneratorService.getWhiteboardUrlPath(
            whiteboard.id,
            whiteboard.nameID
          );
        } catch (urlError) {
          this.logger.verbose?.(
            `create_whiteboard: could not resolve URL for whiteboard ${whiteboard.id}: ${urlError instanceof Error ? urlError.message : 'unknown error'}`,
            LogContext.MCP_SERVER
          );
        }
      }
      const result = {
        created: true,
        calloutId,
        contributionId: contribution.id,
        whiteboard: whiteboard
          ? {
              id: whiteboard.id,
              nameID: whiteboard.nameID,
              displayName: whiteboard.profile?.displayName ?? displayName,
              url,
            }
          : null,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
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
