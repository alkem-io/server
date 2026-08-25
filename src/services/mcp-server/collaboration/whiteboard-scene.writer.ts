import { WhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import * as Y from 'yjs';
import { newCursor, placeAt } from '../tools/whiteboard-placement';

/**
 * The element operations `edit_whiteboard_elements` applies. A discriminated union
 * mirroring the tool's published schema.
 */
export type EditOp =
  | {
      op: 'addShape';
      shape: 'rectangle' | 'ellipse' | 'diamond';
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

export interface EditResult {
  added: string[];
  summary: string[];
}

/** Minimal shape of the element records we read from / pass to the fork Scene. */
type El = Record<string, unknown> & {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isDeleted?: boolean;
  boundElements?: { id: string; type: string }[] | null;
};

/**
 * Apply a list of element operations to a whiteboard's live `Y.Doc`, going through
 * the fork's `Scene` scoped-intent API (`insertElement` / `mutateElement`) — the
 * fork owns element semantics; the server never reimplements them and never does a
 * whole-scene reconcile. The session collects every update the ops produce and
 * merges them into ONE wire frame, so the whole batch travels as a single update
 * frame. Returns the ids added and a per-op summary.
 *
 * On the first invalid op it throws `EditOpError`. This is NOT a Yjs transaction
 * rollback: the throw is synchronous inside the session's `sendMutation`, so it
 * propagates BEFORE that method emits any frame — ZERO WS update frame is sent and
 * the failed edit never reaches the server. Any mutations already applied live only
 * in the ephemeral local `Y.Doc`, which is discarded when the session closes.
 */
export function applyEditOps(
  doc: Y.Doc,
  fork: WhiteboardFork,
  operations: EditOp[]
): EditResult {
  // Adopt the synced doc; the Scene reads/writes the same `Y.Doc` the room holds.
  const scene = new (fork as any).Scene(undefined, { doc });
  const newElement = (fork as any).newElement as (
    opts: Record<string, unknown>
  ) => El;

  const current = scene.getNonDeletedElements() as readonly El[];
  const cursor = newCursor(current as any);
  const added: string[] = [];
  const summary: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    switch (op.op) {
      case 'addShape': {
        const width = op.width ?? 200;
        const height = op.height ?? 100;
        const el = newElement({
          type: op.shape,
          x: 0,
          y: 0,
          width,
          height,
          backgroundColor: op.fillColor,
          strokeColor: op.strokeColor,
        });
        if (op.x != null && op.y != null) {
          el.x = op.x;
          el.y = op.y;
        } else {
          placeAt(cursor, el as any);
        }
        scene.insertElement(el);
        added.push(el.id);
        summary.push(`added ${op.shape} ${el.id}`);
        // A label is a text element bound into the shape; its geometry is sized by
        // the fork's text metrics (configured at bootstrap).
        if (op.label?.trim()) {
          const label = newElement({
            type: 'text',
            text: op.label,
            x: (el.x ?? 0) + 10,
            y: (el.y ?? 0) + height / 2 - 12,
            containerId: el.id,
            strokeColor: op.strokeColor,
          });
          scene.insertElement(label);
          scene.mutateElement(el, {
            boundElements: [
              ...(el.boundElements ?? []),
              { id: label.id, type: 'text' },
            ],
          });
          added.push(label.id);
        }
        break;
      }
      case 'addText': {
        if (!op.text?.trim()) {
          throw new EditOpError(i, 'addText requires non-empty "text".');
        }
        const el = newElement({
          type: 'text',
          text: op.text,
          x: 0,
          y: 0,
          fontSize: op.fontSize,
          strokeColor: op.strokeColor,
        });
        if (op.x != null && op.y != null) {
          el.x = op.x;
          el.y = op.y;
        } else {
          placeAt(cursor, el as any);
        }
        scene.insertElement(el);
        added.push(el.id);
        summary.push(`added text ${el.id}`);
        break;
      }
      case 'connect': {
        const from = scene.getElement(op.fromId) as El | null;
        const to = scene.getElement(op.toId) as El | null;
        if (!from || !to) {
          throw new EditOpError(
            i,
            `connect needs existing fromId/toId; missing ${!from ? op.fromId : op.toId}.`
          );
        }
        const fx = (from.x ?? 0) + (from.width ?? 0) / 2;
        const fy = (from.y ?? 0) + (from.height ?? 0) / 2;
        const tx = (to.x ?? 0) + (to.width ?? 0) / 2;
        const ty = (to.y ?? 0) + (to.height ?? 0) / 2;
        const arrow = newElement({
          type: 'arrow',
          x: fx,
          y: fy,
          width: tx - fx,
          height: ty - fy,
          points: [
            [0, 0],
            [tx - fx, ty - fy],
          ],
          startBinding: { elementId: from.id, focus: 0, gap: 4 },
          endBinding: { elementId: to.id, focus: 0, gap: 4 },
        });
        scene.insertElement(arrow);
        scene.mutateElement(from, {
          boundElements: [
            ...(from.boundElements ?? []),
            { id: arrow.id, type: 'arrow' },
          ],
        });
        scene.mutateElement(to, {
          boundElements: [
            ...(to.boundElements ?? []),
            { id: arrow.id, type: 'arrow' },
          ],
        });
        added.push(arrow.id);
        summary.push(`connected ${from.id} -> ${to.id}`);
        break;
      }
      case 'setText': {
        if (!op.text?.trim()) {
          throw new EditOpError(i, 'setText requires non-empty "text".');
        }
        const target = scene.getElement(op.elementId) as El | null;
        if (!target) {
          throw new EditOpError(i, `element ${op.elementId} not found.`);
        }
        if (target.type === 'text') {
          scene.mutateElement(target, {
            text: op.text,
            originalText: op.text,
          });
        } else {
          const ref = (target.boundElements ?? []).find(b => b.type === 'text');
          const existing = ref ? (scene.getElement(ref.id) as El | null) : null;
          if (existing) {
            scene.mutateElement(existing, {
              text: op.text,
              originalText: op.text,
            });
          } else {
            const label = newElement({
              type: 'text',
              text: op.text,
              x: (target.x ?? 0) + 10,
              y: (target.y ?? 0) + (target.height ?? 0) / 2 - 12,
              containerId: target.id,
            });
            scene.insertElement(label);
            scene.mutateElement(target, {
              boundElements: [
                ...(target.boundElements ?? []),
                { id: label.id, type: 'text' },
              ],
            });
            added.push(label.id);
          }
        }
        summary.push(`set text on ${op.elementId}`);
        break;
      }
      case 'remove': {
        const target = scene.getElement(op.elementId) as El | null;
        if (!target) {
          throw new EditOpError(i, `element ${op.elementId} not found.`);
        }
        // Tombstone the element and any text it contains (scoped, not a rebuild).
        scene.mutateElement(target, { isDeleted: true });
        for (const b of target.boundElements ?? []) {
          if (b.type === 'text') {
            const child = scene.getElement(b.id) as El | null;
            if (child) {
              scene.mutateElement(child, { isDeleted: true });
            }
          }
        }
        summary.push(`removed ${op.elementId}`);
        break;
      }
      default:
        throw new EditOpError(i, `unknown op "${(op as { op: string }).op}".`);
    }
  }

  return { added, summary };
}

/** Thrown on the first invalid op; carries the op index for a precise tool error. */
export class EditOpError extends Error {
  constructor(
    public readonly index: number,
    reason: string
  ) {
    super(`operations[${index}]: ${reason}`);
    this.name = 'EditOpError';
  }
}
