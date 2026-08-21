import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { loadWhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import {
  DocumentPurgingError,
  ReadOnlyRoomError,
} from '@services/collaboration-client/collaboration-document.session';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  applyEditOps,
  EditOp,
  EditOpError,
} from '../collaboration/whiteboard-scene.writer';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface EditWhiteboardElementsArgs {
  whiteboardId: string;
  operations: EditOp[];
}

/**
 * Edit a whiteboard by applying a small list of element operations (deltas) — add a
 * shape/text, connect two elements with an arrow, change an element's text, or remove
 * an element. The assistant joins the whiteboard's LIVE collaboration room as an
 * ephemeral Yjs collaborator and applies the ops through the excalidraw-yjs fork's
 * scoped-intent API (`insertElement`/`mutateElement`) — the same per-property CRDT
 * path human editors use. There is no scene JSON, no whole-scene overwrite, and no
 * direct storage write: the change fans out to live editors and persists durably
 * through the normal room lifecycle. Gated by `UPDATE_CONTENT`.
 */
@Injectable()
export class EditWhiteboardElementsTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly collaborationService: CollaborationDocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'edit_whiteboard_elements',
      description:
        'Edit an existing whiteboard by applying a SMALL LIST of element operations (deltas) — ' +
        "add a shape, add text, connect two elements with an arrow, change an element's text, or " +
        'remove an element. New elements without explicit x/y are auto-placed in EMPTY SPACE below ' +
        'existing content (no overlap). Each operation references existing elements by id (get ids ' +
        'from analyze_whiteboard). The edit is applied live through the whiteboard collaboration ' +
        'room and merges per-property with any concurrent human editing — nothing is overwritten. ' +
        'Requires UPDATE_CONTENT access to the whiteboard.',
      inputSchema: {
        type: 'object',
        properties: {
          whiteboardId: {
            type: 'string',
            description: 'The ID of the whiteboard to edit.',
          },
          operations: {
            type: 'array',
            minItems: 1,
            description:
              'Ordered list of element operations (deltas), applied in order. Each item has an ' +
              '"op" of addShape | addText | connect | setText | remove plus that op\'s fields.',
            items: {
              type: 'object',
              properties: {
                op: {
                  type: 'string',
                  enum: ['addShape', 'addText', 'connect', 'setText', 'remove'],
                  description:
                    'addShape (needs "shape"): add rectangle/ellipse/diamond, optional "label" + "fillColor". ' +
                    'addText (needs "text"): add standalone text. ' +
                    'connect (needs "fromId","toId"): bound arrow between two existing elements. ' +
                    'setText (needs "elementId","text"): replace a text element, or a shape\'s bound label. ' +
                    'remove (needs "elementId"): delete an element (and its bindings).',
                },
                shape: {
                  type: 'string',
                  enum: ['rectangle', 'ellipse', 'diamond'],
                  description: 'addShape: the shape kind.',
                },
                label: {
                  type: 'string',
                  description:
                    'addShape (optional): a centered text label bound inside the shape.',
                },
                fillColor: {
                  type: 'string',
                  description:
                    'addShape (optional): background color, e.g. "#a5d8ff". Defaults to transparent.',
                },
                strokeColor: {
                  type: 'string',
                  description:
                    'Optional outline/text color. Defaults to #1e1e1e.',
                },
                x: {
                  type: 'number',
                  description:
                    'Optional explicit top-left X. Omit for auto-placement below existing content.',
                },
                y: {
                  type: 'number',
                  description:
                    'Optional explicit top-left Y. Omit for auto-placement.',
                },
                width: {
                  type: 'number',
                  description:
                    'Optional width. Defaults: shape 200, text auto from content.',
                },
                height: {
                  type: 'number',
                  description:
                    'Optional height. Defaults: shape 100, text auto from content.',
                },
                text: {
                  type: 'string',
                  description:
                    'addText / setText: the text content (non-empty).',
                },
                fontSize: {
                  type: 'number',
                  description: 'Optional font size. Default 20.',
                },
                fromId: {
                  type: 'string',
                  description: 'connect: id of the source element.',
                },
                toId: {
                  type: 'string',
                  description: 'connect: id of the target element.',
                },
                elementId: {
                  type: 'string',
                  description:
                    'setText: id of the text element OR the shape whose bound label to set. remove: id of the element to delete.',
                },
              },
              required: ['op'],
            },
          },
        },
        required: ['whiteboardId', 'operations'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { whiteboardId, operations } = args as EditWhiteboardElementsArgs;

    if (!whiteboardId) {
      return this.errorResult('"whiteboardId" is required.');
    }
    if (!Array.isArray(operations) || operations.length === 0) {
      return this.errorResult('"operations" must be a non-empty array.');
    }

    // Entity must exist + be authorized through the SAME AuthorizationService as
    // GraphQL BEFORE we join a room — never infer a board from an empty Y.Doc.
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
    const allowed = this.authorizationService.isAccessGranted(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT
    );
    if (!allowed) {
      this.logger.warn?.(
        `Denied edit_whiteboard_elements: actor ${actorContext.actorID || 'anonymous'} lacks UPDATE_CONTENT on whiteboard ${whiteboardId}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        'Access denied: you do not have permission to edit this whiteboard.'
      );
    }

    const fork = await loadWhiteboardFork();
    let result: { added: string[]; summary: string[] } | undefined;
    try {
      // Join the live room, apply the ops as ONE Yjs transaction (one update frame),
      // and return only once the change is durably persisted (ControlSaved).
      await this.collaborationService.mutate(
        whiteboardId,
        'whiteboard',
        actorContext.actorID,
        doc => {
          result = applyEditOps(doc, fork, operations);
        }
      );
    } catch (error) {
      if (error instanceof EditOpError) {
        return this.errorResult(error.message);
      }
      if (error instanceof ReadOnlyRoomError) {
        return this.errorResult(
          'Access denied: you do not have permission to edit this whiteboard.'
        );
      }
      if (error instanceof DocumentPurgingError) {
        return this.errorResult(`Whiteboard ${whiteboardId} has been deleted.`);
      }
      this.logger.warn?.(
        `edit_whiteboard_elements failed for ${whiteboardId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Could not edit whiteboard: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    this.logger.verbose?.(
      `edit_whiteboard_elements: whiteboard=${whiteboardId}, actor=${actorContext.actorID}, ops=${operations.length}`,
      LogContext.MCP_SERVER
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            updated: true,
            whiteboardId,
            appliedOperations: operations.length,
            addedElementIds: result?.added ?? [],
            summary: result?.summary ?? [],
          }),
        },
      ],
    };
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
