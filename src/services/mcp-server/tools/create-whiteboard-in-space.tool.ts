import { LogContext } from '@common/enums';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutsSetResolverMutations } from '@domain/collaboration/callouts-set/callouts.set.resolver.mutations';
import { CreateCalloutOnCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create.callout';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateService } from '@domain/template/template/template.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import { resolveTemplateScene } from './whiteboard-template-scene';

interface CreateWhiteboardInSpaceArgs {
  spaceId: string;
  displayName: string;
  /** A full Excalidraw scene JSON string. Provide this OR `fromTemplateId`. */
  content?: string;
  /**
   * A whiteboard TEMPLATE id to fill the new board with, by reference. When set,
   * the server loads the template scene server-side — the scene never travels
   * through the model. Provide this OR `content` (or neither for a blank board).
   */
  fromTemplateId?: string;
}

/**
 * Tool for creating a NEW standalone whiteboard directly in a space or subspace,
 * as its own **whiteboard-framing callout** (the callout *is* the board).
 *
 * Unlike `create_whiteboard` — which adds a whiteboard CONTRIBUTION to an existing
 * callout that already accepts whiteboard contributions — this tool needs no
 * pre-existing callout: it creates the hosting callout on the space's CalloutsSet
 * for you. So "create a whiteboard in space X / subspace Y" works even when no
 * suitable callout exists.
 *
 * Authorization mirrors the GraphQL mutation: the work is delegated to
 * `CalloutsSetResolverMutations.createCalloutOnCalloutsSet`, which enforces the
 * `CREATE_CALLOUT` privilege on the space's CalloutsSet — so an actor can only
 * create a callout where they could through the normal API.
 */
@Injectable()
export class CreateWhiteboardInSpaceTool implements McpTool {
  constructor(
    private readonly calloutsSetResolverMutations: CalloutsSetResolverMutations,
    private readonly spaceLookupService: SpaceLookupService,
    @InjectRepository(Callout)
    private readonly calloutRepository: Repository<Callout>,
    private readonly templateService: TemplateService,
    private readonly authorizationService: AuthorizationService,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'create_whiteboard_in_space',
      description:
        'Create a NEW standalone whiteboard directly in a SPACE or SUBSPACE (as its own callout — ' +
        'the callout IS the board). Use this when you want to add a whiteboard to a space and do ' +
        'NOT have a specific callout that already accepts whiteboard contributions — it creates the ' +
        'hosting callout for you, so "create a whiteboard in space X" works even when no suitable ' +
        'callout exists. (To add a whiteboard to an EXISTING callout that accepts contributions, use ' +
        'create_whiteboard instead.) Provide the space/subspace id (resolve it from a name via ' +
        'search_content / list_whiteboards). To start FROM A TEMPLATE, set "fromTemplateId" — the ' +
        'server fills the board with the template scene by reference, so do NOT generate or paste the ' +
        'scene yourself. Otherwise set "content" to a full Excalidraw scene JSON string, or omit both ' +
        'for a blank board. Provide at most one of "fromTemplateId" or "content". Requires ' +
        'CREATE_CALLOUT access on the space.',
      inputSchema: {
        type: 'object',
        properties: {
          spaceId: {
            type: 'string',
            description:
              'The ID of the space OR subspace to create the whiteboard in (its CalloutsSet hosts the new callout).',
          },
          displayName: {
            type: 'string',
            description:
              'The display name (title) for the new whiteboard (min 3 characters).',
          },
          fromTemplateId: {
            type: 'string',
            description:
              'A whiteboard template id to fill the new board with, by reference. PREFERRED way to ' +
              'start from a template — the server applies the template scene; do not pass the scene ' +
              'yourself. Provide this OR "content".',
          },
          content: {
            type: 'string',
            description:
              'A full Excalidraw scene JSON string. Optional — omit for a blank board. To start from ' +
              'a template use "fromTemplateId" instead. Provide this OR "fromTemplateId".',
          },
        },
        required: ['spaceId', 'displayName'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { spaceId, displayName, content, fromTemplateId } =
      args as CreateWhiteboardInSpaceArgs;

    if (!spaceId || !displayName) {
      return this.errorResult('Both "spaceId" and "displayName" are required.');
    }
    if (displayName.trim().length < 3) {
      return this.errorResult('"displayName" must be at least 3 characters.');
    }
    if (content && fromTemplateId) {
      return this.errorResult(
        'Provide only one of "fromTemplateId" or "content", not both.'
      );
    }

    // Resolve the scene the new board starts with: from a template (server-side,
    // by reference — the scene never passes through the model), the explicit
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
      try {
        JSON.parse(content);
      } catch {
        return this.errorResult(
          'The "content" is not valid JSON. Provide a valid Excalidraw scene JSON string, or use "fromTemplateId" to start from a template.'
        );
      }
      sceneContent = content;
    }

    // Resolve the space/subspace -> its Collaboration -> CalloutsSet (where
    // callouts are created). getSpaceOrFail works for any level by id.
    let calloutsSetId: string | undefined;
    try {
      const space = await this.spaceLookupService.getSpaceOrFail(spaceId, {
        relations: { collaboration: { calloutsSet: true } },
      });
      calloutsSetId = space.collaboration?.calloutsSet?.id;
    } catch {
      return this.errorResult(`Space not found: ${spaceId}`);
    }
    if (!calloutsSetId) {
      return this.errorResult(
        `Space ${spaceId} has no collaboration/callouts set to create a whiteboard in.`
      );
    }

    this.logger.verbose?.(
      `create_whiteboard_in_space: space=${spaceId}, calloutsSet=${calloutsSetId}, name="${displayName}", actor=${actorContext.actorID || 'anonymous'}${fromTemplateId ? `, fromTemplate=${fromTemplateId}` : ''}`,
      LogContext.MCP_SERVER
    );

    const calloutData = {
      calloutsSetID: calloutsSetId,
      sortOrder: 1000,
      framing: {
        profile: { displayName },
        type: CalloutFramingType.WHITEBOARD,
        whiteboard: {
          profile: { displayName },
          ...(sceneContent ? { content: sceneContent } : {}),
        },
      },
    } as CreateCalloutOnCalloutsSetInput;

    try {
      // Delegates auth (CREATE_CALLOUT on the CalloutsSet) + full orchestration to
      // the same path the GraphQL mutation uses.
      const callout =
        await this.calloutsSetResolverMutations.createCalloutOnCalloutsSet(
          actorContext,
          calloutData
        );

      // The resolver's return doesn't eager-load the framing whiteboard, so reload
      // it to surface the new board's id/name/url to the caller.
      const reloaded = await this.calloutRepository.findOne({
        where: { id: callout.id },
        relations: { framing: { whiteboard: { profile: true } } },
      });
      const whiteboard = reloaded?.framing?.whiteboard;

      let url: string | undefined;
      if (whiteboard) {
        try {
          url = await this.urlGeneratorService.getWhiteboardUrlPath(
            whiteboard.id,
            whiteboard.nameID
          );
        } catch (urlError) {
          this.logger.verbose?.(
            `create_whiteboard_in_space: could not resolve URL for whiteboard ${whiteboard.id}: ${urlError instanceof Error ? urlError.message : 'unknown error'}`,
            LogContext.MCP_SERVER
          );
        }
      }

      const result = {
        created: true,
        spaceId,
        calloutId: callout.id,
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
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      this.logger.warn?.(
        `create_whiteboard_in_space failed for space ${spaceId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Could not create whiteboard in space: ${error instanceof Error ? error.message : 'unknown error'}`
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
