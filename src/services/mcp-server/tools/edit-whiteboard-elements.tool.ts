import { WHITEBOARD_COLLABORATION_SERVICE } from '@common/constants/providers';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WhiteboardIntegrationEventPattern } from '@services/whiteboard-integration/types/event.pattern';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import {
  addBoundRef,
  makeArrow,
  makeLabelledShape,
  makeShape,
  makeText,
  type SceneElement,
  type ShapeKind,
} from './whiteboard-element.factory';
import { newCursor, placeAt } from './whiteboard-placement';

type EditOp =
  | {
      op: 'addShape';
      shape: ShapeKind;
      label?: string;
      fillColor?: string;
      strokeColor?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  | {
      op: 'addText';
      text: string;
      fontSize?: number;
      strokeColor?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  | { op: 'connect'; fromId: string; toId: string; arrowLabel?: string }
  | { op: 'setText'; elementId: string; text: string }
  | { op: 'remove'; elementId: string };

interface EditWhiteboardElementsArgs {
  whiteboardId: string;
  operations: EditOp[];
}

const SHAPE_KINDS: ReadonlySet<string> = new Set([
  'rectangle',
  'ellipse',
  'diamond',
]);

/**
 * Edit a whiteboard by applying a small list of element operations (deltas) —
 * add a shape/text, connect two elements with an arrow, change an element's text,
 * or remove an element. This is the additive, incremental alternative to
 * `update_whiteboard_content` (which overwrites the whole scene): the assistant
 * never has to re-emit the entire Excalidraw scene, which both stalls the model
 * and produces overlapping, messy layouts.
 *
 * New elements without explicit x/y are auto-placed in empty space BELOW the
 * existing content, so additions never overlap. Gated by `UPDATE_CONTENT` on the
 * whiteboard (a WRITE_ADDITIVE capability — confirmation-gated, US2).
 */
@Injectable()
export class EditWhiteboardElementsTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WHITEBOARD_COLLABORATION_SERVICE)
    private readonly whiteboardCollaborationClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'edit_whiteboard_elements',
      description:
        'Edit an existing whiteboard by applying a SMALL LIST of element operations (deltas) — ' +
        "add a shape, add text, connect two elements with an arrow, change an element's text, or " +
        'remove an element. PREFER THIS over update_whiteboard_content for incremental edits: ' +
        'do NOT re-send the whole Excalidraw scene to add or change a few elements (that is slow ' +
        'and produces overlapping, messy layouts). This tool appends new elements in EMPTY SPACE ' +
        'below the existing content (no overlap) unless you pass explicit x/y. Each operation ' +
        'references existing elements by their id (get ids from analyze_whiteboard). Requires ' +
        'UPDATE_CONTENT access to the whiteboard. CAUTION: the live collaboration service owns ' +
        'content while a board is open — if someone is actively editing, this direct write may be ' +
        'overwritten by their next save; use when the board is not being actively edited.',
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

    // Load the decompressed scene (the entity @AfterLoad already decompressed it).
    let scene: { elements?: SceneElement[]; [key: string]: unknown };
    try {
      scene = JSON.parse(whiteboard.content);
    } catch {
      return this.errorResult(
        'Whiteboard content is not valid Excalidraw JSON.'
      );
    }
    if (!Array.isArray(scene.elements)) {
      scene.elements = [];
    }

    const applied = this.applyOperations(scene.elements, operations);
    if ('error' in applied) {
      return this.errorResult(applied.error);
    }

    this.logger.verbose?.(
      `edit_whiteboard_elements: whiteboard=${whiteboardId}, actor=${actorContext.actorID}, ops=${operations.length}`,
      LogContext.MCP_SERVER
    );

    try {
      // Persist the FULL scene envelope (type/version/source/appState/files are
      // untouched — we only mutate scene.elements). The entity compresses on save.
      const updated = await this.whiteboardService.updateWhiteboardContent(
        whiteboard.id,
        JSON.stringify(scene)
      );

      try {
        // Carry the element delta so the collaboration service merges it as a
        // normal collaborator update (preserving live edits) instead of falling
        // back to a full-scene reconcile. See WhiteboardCollaborationController.
        this.whiteboardCollaborationClient.emit(
          WhiteboardIntegrationEventPattern.CONTENT_UPDATED_EXTERNALLY,
          { whiteboardId: updated.id, elements: applied.delta }
        );
      } catch (emitError) {
        this.logger.warn?.(
          `edit_whiteboard_elements: failed to emit live-update for ${updated.id}: ${emitError instanceof Error ? emitError.message : 'unknown error'}`,
          LogContext.MCP_SERVER
        );
      }

      let url: string | undefined;
      try {
        // NOTE: use the PRE-loaded whiteboard's nameID — the shared
        // updateWhiteboardContent() returns an entity selected without nameID,
        // which yielded ".../undefined" URLs.
        url = await this.urlGeneratorService.getWhiteboardUrlPath(
          updated.id,
          whiteboard.nameID
        );
      } catch {
        // Best-effort link.
      }

      const result = {
        updated: true,
        whiteboardId: updated.id,
        nameID: whiteboard.nameID,
        appliedOperations: operations.length,
        addedElementIds: applied.added,
        summary: applied.summary,
        url,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (error) {
      this.logger.warn?.(
        `edit_whiteboard_elements failed for ${whiteboardId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Could not edit whiteboard: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  /**
   * Apply the ops to `elements` in place. Returns the new element ids + a per-op
   * summary, or an `error` string (with the offending op index) on the first
   * invalid op — nothing is persisted in that case.
   */
  private applyOperations(
    elements: SceneElement[],
    operations: EditOp[]
  ):
    | { added: string[]; summary: string[]; delta: SceneElement[] }
    | { error: string } {
    const byId = new Map<string, SceneElement>(
      elements.map(e => [e.id, e] as const)
    );
    // Snapshot the pre-edit serialized state so the DELTA can be derived after the
    // ops run, with no per-op bookkeeping: identical JSON afterwards == untouched.
    const before = new Map<string, string>(
      elements.map(e => [e.id, JSON.stringify(e)] as const)
    );
    // One cursor for the whole call, anchored below the PRE-CALL content, so all
    // additions flow into the same empty block and never overlap.
    const cursor = newCursor(elements);
    const added: string[] = [];
    const summary: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      switch (op.op) {
        case 'addShape': {
          if (!SHAPE_KINDS.has(op.shape)) {
            return {
              error: `operations[${i}]: addShape requires "shape" to be rectangle, ellipse, or diamond.`,
            };
          }
          const width = op.width ?? 200;
          const height = op.height ?? 100;
          let container: SceneElement;
          let label: SceneElement | undefined;
          if (op.label?.trim()) {
            [container, label] = makeLabelledShape({
              shape: op.shape,
              x: 0,
              y: 0,
              width,
              height,
              label: op.label,
              fillColor: op.fillColor,
              strokeColor: op.strokeColor,
            });
          } else {
            container = makeShape({
              shape: op.shape,
              x: 0,
              y: 0,
              width,
              height,
              fillColor: op.fillColor,
              strokeColor: op.strokeColor,
            });
          }
          if (op.x != null && op.y != null) {
            container.x = op.x;
            container.y = op.y;
          } else {
            placeAt(cursor, container);
          }
          if (label) {
            // Re-derive the label position from the container's FINAL coords.
            label.x = container.x + 10;
            label.y = container.y + height / 2 - 12;
          }
          elements.push(container);
          byId.set(container.id, container);
          added.push(container.id);
          if (label) {
            elements.push(label);
            byId.set(label.id, label);
            added.push(label.id);
          }
          summary.push(`added ${op.shape} ${container.id}`);
          break;
        }
        case 'addText': {
          if (!op.text?.trim()) {
            return {
              error: `operations[${i}]: addText requires non-empty "text".`,
            };
          }
          const fontSize = op.fontSize ?? 20;
          const width =
            op.width ?? Math.max(op.text.length * fontSize * 0.6, 40);
          const height = op.height ?? fontSize * 1.25 + 5;
          const el = makeText({
            text: op.text,
            x: 0,
            y: 0,
            width,
            height,
            fontSize: op.fontSize,
            strokeColor: op.strokeColor,
          });
          if (op.x != null && op.y != null) {
            el.x = op.x;
            el.y = op.y;
          } else {
            placeAt(cursor, el);
          }
          elements.push(el);
          byId.set(el.id, el);
          added.push(el.id);
          summary.push(`added text ${el.id}`);
          break;
        }
        case 'connect': {
          const from = byId.get(op.fromId);
          const to = byId.get(op.toId);
          if (!from || !to) {
            return {
              error: `operations[${i}]: connect needs existing fromId/toId; missing ${!from ? op.fromId : op.toId}.`,
            };
          }
          const fx = (from.x || 0) + (from.width || 0) / 2;
          const fy = (from.y || 0) + (from.height || 0) / 2;
          const tx = (to.x || 0) + (to.width || 0) / 2;
          const ty = (to.y || 0) + (to.height || 0) / 2;
          const arrow = makeArrow({
            x: fx,
            y: fy,
            width: tx - fx,
            height: ty - fy,
            startId: from.id,
            endId: to.id,
          });
          addBoundRef(from, { type: 'arrow', id: arrow.id });
          addBoundRef(to, { type: 'arrow', id: arrow.id });
          elements.push(arrow);
          byId.set(arrow.id, arrow);
          added.push(arrow.id);
          summary.push(`connected ${from.id} -> ${to.id}`);
          break;
        }
        case 'setText': {
          if (!op.text?.trim()) {
            return {
              error: `operations[${i}]: setText requires non-empty "text".`,
            };
          }
          const target = byId.get(op.elementId);
          if (!target) {
            return {
              error: `operations[${i}]: element ${op.elementId} not found.`,
            };
          }
          if (target.type === 'text') {
            target.text = op.text;
            target.originalText = op.text;
            target.version = (target.version || 1) + 1;
            target.versionNonce = Math.floor(Math.random() * 2 ** 31);
          } else {
            const ref = (
              Array.isArray(target.boundElements) ? target.boundElements : []
            ).find((b: { type: string }) => b.type === 'text');
            const existing = ref ? byId.get(ref.id) : undefined;
            if (existing) {
              existing.text = op.text;
              existing.originalText = op.text;
              existing.version = (existing.version || 1) + 1;
            } else {
              const label = makeText({
                text: op.text,
                x: (target.x || 0) + 10,
                y: (target.y || 0) + (target.height || 0) / 2 - 12,
                width: Math.max((target.width || 200) - 20, 20),
                height: 25,
                containerId: target.id,
                textAlign: 'center',
                verticalAlign: 'middle',
              });
              addBoundRef(target, { type: 'text', id: label.id });
              elements.push(label);
              byId.set(label.id, label);
              added.push(label.id);
            }
          }
          summary.push(`set text on ${op.elementId}`);
          break;
        }
        case 'remove': {
          const target = byId.get(op.elementId);
          if (!target) {
            return {
              error: `operations[${i}]: element ${op.elementId} not found.`,
            };
          }
          const toRemove = new Set<string>([op.elementId]);
          for (const b of Array.isArray(target.boundElements)
            ? target.boundElements
            : []) {
            if (b.type === 'text') {
              toRemove.add(b.id);
            }
          }
          // Filter in place so the reference seen by later ops stays current.
          const kept = elements.filter(e => !toRemove.has(e.id));
          elements.length = 0;
          elements.push(...kept);
          for (const e of elements) {
            if (Array.isArray(e.boundElements)) {
              e.boundElements = e.boundElements.filter(
                (b: { id: string }) => !toRemove.has(b.id)
              );
            }
            if (e.startBinding && toRemove.has(e.startBinding.elementId)) {
              e.startBinding = null;
            }
            if (e.endBinding && toRemove.has(e.endBinding.elementId)) {
              e.endBinding = null;
            }
            if (e.containerId && toRemove.has(e.containerId)) {
              e.containerId = null;
            }
          }
          for (const id of toRemove) {
            byId.delete(id);
          }
          summary.push(`removed ${op.elementId}`);
          break;
        }
        default:
          return {
            error: `operations[${i}]: unknown op "${(op as { op: string }).op}".`,
          };
      }
    }

    // Derive the delta the collaboration service merges into any OPEN room: every
    // element that is new or whose serialized form changed (e.g. a `connect`
    // mutates its endpoints' bindings), plus an isDeleted tombstone — reconstructed
    // from the pre-edit snapshot — for each element the ops removed. Omitting a
    // removed element would not propagate the delete (reconciliation keeps an
    // element a live session still holds); a tombstone does. The collaboration
    // service re-stamps these to win, so a live editor sees the assistant's edits
    // and deletes without losing in-flight edits to untouched elements.
    const delta: SceneElement[] = [];
    const survivingIds = new Set<string>();
    for (const e of elements) {
      survivingIds.add(e.id);
      if (before.get(e.id) !== JSON.stringify(e)) {
        delta.push(e);
      }
    }
    for (const [id, serialized] of before) {
      if (!survivingIds.has(id)) {
        delta.push({ ...JSON.parse(serialized), isDeleted: true });
      }
    }

    return { added, summary, delta };
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
