import { WHITEBOARD_COLLABORATION_SERVICE } from '@common/constants/providers';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { TemplateService } from '@domain/template/template/template.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WhiteboardIntegrationEventPattern } from '@services/whiteboard-integration/types/event.pattern';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import { resolveTemplateScene } from './whiteboard-template-scene';

interface UpdateWhiteboardContentArgs {
  whiteboardId: string;
  /** A full Excalidraw scene JSON string. Provide this OR `fromTemplateId`. */
  content?: string;
  /**
   * A whiteboard TEMPLATE id to apply by reference. When set, the server loads
   * that template's scene server-side and applies it — the scene never travels
   * through the model. Provide this OR `content`.
   */
  fromTemplateId?: string;
}

/**
 * Tool for replacing the content (Excalidraw scene) of an existing whiteboard.
 *
 * Whiteboard content is normally owned by the real-time whiteboard-collaboration
 * service; this tool writes content directly through the same server-side path
 * that service uses (`WhiteboardService.updateWhiteboardContent`), gated by the
 * `UPDATE_CONTENT` privilege on the whiteboard — so an actor can only edit a
 * board they're allowed to edit.
 *
 * IMPORTANT: the collaboration service is the source of truth while a board is
 * open. If someone is actively editing this whiteboard, this direct write will
 * not be seen by their open session and will be overwritten by the next
 * collaborative save. Use it only when the board is not being actively edited.
 */
@Injectable()
export class UpdateWhiteboardContentTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly urlGeneratorService: UrlGeneratorService,
    private readonly templateService: TemplateService,
    @Inject(WHITEBOARD_COLLABORATION_SERVICE)
    private readonly whiteboardCollaborationClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'update_whiteboard_content',
      description:
        'Replace the content (Excalidraw scene) of an existing whiteboard (this overwrites, it does not merge). ' +
        'Provide the new scene in ONE of two ways: ' +
        '(1) set "fromTemplateId" to a whiteboard TEMPLATE id to apply that template — PREFERRED for ' +
        'applying templates: the server loads the template scene by reference, so you must NOT fetch ' +
        'or paste the scene JSON yourself (do not call navigate_templates "details" to get a scene); or ' +
        '(2) set "content" to a full Excalidraw scene JSON string when you genuinely have an explicit scene. ' +
        'Provide exactly one of "fromTemplateId" or "content". ' +
        'Requires UPDATE_CONTENT access to the whiteboard. ' +
        'CAUTION: the live collaboration service owns content while a board is open — ' +
        'if someone is actively editing, this direct write will be overwritten by their next save. ' +
        'Use only when the board is not being actively edited.',
      inputSchema: {
        type: 'object',
        properties: {
          whiteboardId: {
            type: 'string',
            description: 'The ID of the whiteboard to update.',
          },
          fromTemplateId: {
            type: 'string',
            description:
              'A whiteboard template id to apply by reference. PREFERRED way to apply a template — ' +
              'the server loads and applies the template scene; do not pass the scene yourself. ' +
              'Provide this OR "content".',
          },
          content: {
            type: 'string',
            description:
              'A full Excalidraw scene JSON string (overwrites existing content). Use only for an ' +
              'explicit scene you already have; to apply a template use "fromTemplateId" instead. ' +
              'Provide this OR "fromTemplateId".',
          },
        },
        required: ['whiteboardId'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { whiteboardId, content, fromTemplateId } =
      args as UpdateWhiteboardContentArgs;

    if (!whiteboardId) {
      return this.errorResult('"whiteboardId" is required.');
    }
    if (!content && !fromTemplateId) {
      return this.errorResult(
        'Provide "fromTemplateId" to apply a whiteboard template, or "content" with a full Excalidraw scene JSON.'
      );
    }
    if (content && fromTemplateId) {
      return this.errorResult(
        'Provide only one of "fromTemplateId" or "content", not both.'
      );
    }

    // Resolve the scene to write: from a template (server-side, by reference — the
    // scene never passes through the model) or from the explicit content arg.
    let sceneContent: string;
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
    } else {
      sceneContent = content as string;
      // updateWhiteboardContent JSON.parses the content; validate up front for a
      // clean error message.
      try {
        JSON.parse(sceneContent);
      } catch {
        return this.errorResult(
          'The "content" is not valid JSON. Provide a valid Excalidraw scene JSON string, or use "fromTemplateId" to apply a template.'
        );
      }
    }

    let whiteboard: Awaited<
      ReturnType<WhiteboardService['getWhiteboardOrFail']>
    >;
    try {
      whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        whiteboardId,
        { relations: { authorization: true } }
      );
    } catch {
      return this.errorResult(`Whiteboard not found: ${whiteboardId}`);
    }

    if (!whiteboard.authorization) {
      return this.errorResult(
        `Whiteboard ${whiteboardId} has no authorization policy.`
      );
    }

    // Mirror the content-edit gate used by the collaboration integration.
    const allowed = this.authorizationService.isAccessGranted(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT
    );
    if (!allowed) {
      this.logger.warn?.(
        `Denied update_whiteboard_content: actor ${actorContext.actorID || 'anonymous'} lacks UPDATE_CONTENT on whiteboard ${whiteboardId}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        'Access denied: you do not have permission to edit this whiteboard.'
      );
    }

    this.logger.verbose?.(
      `update_whiteboard_content: whiteboard=${whiteboardId}, actor=${actorContext.actorID}${fromTemplateId ? `, fromTemplate=${fromTemplateId}` : ''}`,
      LogContext.MCP_SERVER
    );

    try {
      const updated = await this.whiteboardService.updateWhiteboardContent(
        whiteboardId,
        sceneContent
      );

      // Fire-and-forget: notify the collaboration service so any OPEN Excalidraw
      // room for this whiteboard reloads from the DB and pushes the new scene to
      // live editors. Emitted HERE (not inside WhiteboardService.updateWhiteboardContent)
      // because the collaboration service's own save path flows through that
      // method — emitting there would echo on every autosave. A broker hiccup
      // must never break the tool result, so failures are swallowed.
      try {
        this.whiteboardCollaborationClient.emit(
          WhiteboardIntegrationEventPattern.CONTENT_UPDATED_EXTERNALLY,
          { whiteboardId: updated.id }
        );
        this.logger.verbose?.(
          `update_whiteboard_content: emitted ${WhiteboardIntegrationEventPattern.CONTENT_UPDATED_EXTERNALLY} for whiteboard=${updated.id}`,
          LogContext.MCP_SERVER
        );
      } catch (emitError) {
        this.logger.warn?.(
          `update_whiteboard_content: failed to emit live-update event for ${updated.id}: ${emitError instanceof Error ? emitError.message : 'unknown error'}`,
          LogContext.MCP_SERVER
        );
      }

      // Real, browser-openable web URL via the platform's own UrlGeneratorService.
      // Best-effort: omit the link if it cannot be resolved rather than failing.
      let url: string | undefined;
      try {
        url = await this.urlGeneratorService.getWhiteboardUrlPath(
          updated.id,
          updated.nameID
        );
      } catch (urlError) {
        this.logger.verbose?.(
          `update_whiteboard_content: could not resolve URL for whiteboard ${updated.id}: ${urlError instanceof Error ? urlError.message : 'unknown error'}`,
          LogContext.MCP_SERVER
        );
      }
      const result = {
        updated: true,
        whiteboardId: updated.id,
        nameID: updated.nameID,
        url,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      this.logger.warn?.(
        `update_whiteboard_content failed for ${whiteboardId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Could not update whiteboard content: ${error instanceof Error ? error.message : 'unknown error'}`
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
