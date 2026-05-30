import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface UpdateWhiteboardContentArgs {
  whiteboardId: string;
  content: string;
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'update_whiteboard_content',
      description:
        'Replace the content (Excalidraw scene) of an existing whiteboard. ' +
        'Provide the full new scene as JSON in "content" (this overwrites, it does not merge). ' +
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
          content: {
            type: 'string',
            description:
              'The new whiteboard content as a full Excalidraw scene JSON string. Overwrites existing content.',
          },
        },
        required: ['whiteboardId', 'content'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { whiteboardId, content } = args as UpdateWhiteboardContentArgs;

    if (!whiteboardId || !content) {
      return this.errorResult(
        'Both "whiteboardId" and "content" are required.'
      );
    }

    // updateWhiteboardContent JSON.parses the content; validate up front for a
    // clean error message.
    try {
      JSON.parse(content);
    } catch {
      return this.errorResult(
        'The "content" is not valid JSON. Provide a valid Excalidraw scene JSON string.'
      );
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
      `update_whiteboard_content: whiteboard=${whiteboardId}, actor=${actorContext.actorID}`,
      LogContext.MCP_SERVER
    );

    try {
      const updated = await this.whiteboardService.updateWhiteboardContent(
        whiteboardId,
        content
      );
      const result = {
        updated: true,
        whiteboardId: updated.id,
        nameID: updated.nameID,
        uri: `alkemio://whiteboards/${updated.id}`,
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
