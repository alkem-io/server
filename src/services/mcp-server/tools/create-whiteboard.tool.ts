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
import { resolveTemplateScene } from './whiteboard-template-scene';

interface CreateWhiteboardArgs {
  calloutId: string;
  displayName: string;
  content?: string;
  /**
   * A whiteboard TEMPLATE id to fill the new board with, by reference. When set,
   * the server loads the template scene server-side — the scene never travels
   * through the model. Provide this OR `content` (or neither for a blank board).
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
        'Create a whiteboard on a callout. To create it FROM A TEMPLATE, set "fromTemplateId" to ' +
        'the whiteboard template id — PREFERRED: the server fills the new board with the template ' +
        'scene by reference, so you must NOT generate or paste the scene yourself (do not call ' +
        'navigate_templates "details" to fetch a scene). Otherwise set "content" to a full ' +
        'Excalidraw scene JSON string, or omit both for a blank board. Provide at most one of ' +
        '"fromTemplateId" or "content". Requires CONTRIBUTE access to the target callout, and the ' +
        'callout must allow whiteboard contributions. Use list_whiteboards / a callout id to pick ' +
        'the target. A "content" scene must look like ' +
        '{"type":"excalidraw","version":2,"elements":[...],"appState":{...}}.',
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
              'A whiteboard template id to fill the new board with, by reference. PREFERRED way to ' +
              'create a board from a template — the server applies the template scene; do not pass ' +
              'the scene yourself. Provide this OR "content".',
          },
          content: {
            type: 'string',
            description:
              'A full Excalidraw scene JSON string. Optional — omit for a blank board. To create ' +
              'from a template use "fromTemplateId" instead. Provide this OR "fromTemplateId".',
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
    const { calloutId, displayName, content, fromTemplateId } =
      args as CreateWhiteboardArgs;

    if (!calloutId || !displayName) {
      return this.errorResult(
        'Both "calloutId" and "displayName" are required.'
      );
    }
    if (content && fromTemplateId) {
      return this.errorResult(
        'Provide only one of "fromTemplateId" or "content", not both.'
      );
    }

    // Resolve the scene the new board starts with: from a template (server-side,
    // by reference — the scene never passes through the model), from the explicit
    // content arg, or blank.
    let sceneContent: string | undefined;
    if (fromTemplateId) {
      const resolved = await resolveTemplateScene(
        this.templateService,
        this.authorizationService,
        fromTemplateId,
        actorContext
      );
      if ('error' in resolved) {
        return this.errorResult(resolved.error);
      }
      sceneContent = resolved.scene;
    } else if (content !== undefined && content !== '') {
      // The GraphQL scalar JSON.parses the content on the normal path; we call the
      // resolver directly, so validate up front for a clean error message.
      try {
        JSON.parse(content);
      } catch {
        return this.errorResult(
          'The "content" is not valid JSON. Provide a valid Excalidraw scene JSON string, or use "fromTemplateId" to start from a template.'
        );
      }
      sceneContent = content;
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
        ...(sceneContent ? { content: sceneContent } : {}),
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
