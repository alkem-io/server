import { randomUUID } from 'node:crypto';

/**
 * Server-side Excalidraw element factory for `edit_whiteboard_elements`.
 *
 * The assistant edits a whiteboard by emitting small element deltas; this factory
 * builds the concrete Excalidraw elements the server appends to the scene. The
 * client runs `restoreElements()` on load/reconcile (it back-fills missing
 * defaults), so the factory does not need to be exhaustive — but it writes a
 * COHERENT element so the board renders even before that restore pass.
 *
 * Hard invariants baked in (each one silently breaks rendering if wrong):
 *  - `version >= 1` (0 makes Excalidraw's version-dedup drop the element);
 *  - `fontFamily` is the NUMERIC font enum, not a string;
 *  - arrow `points` start at `[0, 0]` and have >= 2 points;
 *  - shapes always get real (> 0) width/height;
 *  - text is never empty (callers reject that upstream);
 *  - a binding emits BOTH sides (container.boundElements <-> text.containerId;
 *    arrow.startBinding/endBinding <-> each endpoint's boundElements).
 */

/** Any Excalidraw element — the server treats element internals as opaque JSON. */
export type SceneElement = Record<string, any>;

const BLACK = '#1e1e1e';
const TRANSPARENT = 'transparent';
/** FONT_FAMILY.Excalifont — a numeric enum value, NOT a string. */
const FONT_EXCALIFONT = 5;
const LINE_HEIGHT = 1.25;
const DEFAULT_FONT_SIZE = 20;

/** Best-effort unique nonce/seed; values only need to be numbers. */
const nonce = (): number => Math.floor(Math.random() * 2 ** 31);

/**
 * Shared base every element needs. `restoreElements()` back-fills most of this,
 * but we write a coherent object so it renders pre-restore. `version` MUST be >= 1.
 */
function base(
  type: string,
  x: number,
  y: number,
  width: number,
  height: number
): SceneElement {
  return {
    id: randomUUID(),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: BLACK,
    backgroundColor: TRANSPARENT,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nonce(),
    version: 1,
    versionNonce: nonce(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    index: null,
  };
}

export type ShapeKind = 'rectangle' | 'ellipse' | 'diamond';

/** rectangle / ellipse / diamond. width/height MUST be > 0 or the element is invisible. */
export function makeShape(opts: {
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
}): SceneElement {
  const el = base(opts.shape, opts.x, opts.y, opts.width, opts.height);
  if (opts.fillColor) {
    el.backgroundColor = opts.fillColor;
  }
  if (opts.strokeColor) {
    el.strokeColor = opts.strokeColor;
  }
  // Rectangles look better with a slightly rounded corner.
  if (opts.shape === 'rectangle') {
    el.roundness = { type: 3 };
  }
  return el;
}

/**
 * Standalone or bound text. Empty/whitespace text makes restore mark the element
 * `isDeleted` — callers MUST reject empty text upstream.
 */
export function makeText(opts: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  strokeColor?: string;
  /** Set when the text is bound inside a shape (its container's id). */
  containerId?: string | null;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}): SceneElement {
  const fontSize = opts.fontSize ?? DEFAULT_FONT_SIZE;
  const el = base('text', opts.x, opts.y, opts.width, opts.height);
  if (opts.strokeColor) {
    el.strokeColor = opts.strokeColor;
  }
  return {
    ...el,
    text: opts.text,
    originalText: opts.text,
    fontSize,
    fontFamily: FONT_EXCALIFONT,
    textAlign: opts.textAlign ?? 'left',
    verticalAlign: opts.verticalAlign ?? 'top',
    containerId: opts.containerId ?? null,
    autoResize: true,
    lineHeight: LINE_HEIGHT,
  };
}

/** Build a labelled shape: returns [container, boundText] with reciprocal links. */
export function makeLabelledShape(opts: {
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fillColor?: string;
  strokeColor?: string;
}): [SceneElement, SceneElement] {
  const container = makeShape(opts);
  const text = makeText({
    text: opts.label,
    // Padded inside the container; restore + the client recompute exact metrics.
    x: opts.x + 10,
    y: opts.y + opts.height / 2 - 12,
    width: Math.max(opts.width - 20, 20),
    height: 25,
    containerId: container.id,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: opts.strokeColor,
  });
  container.boundElements = [{ type: 'text', id: text.id }];
  return [container, text];
}

/**
 * Arrow bound to two existing shapes. The caller MUST also append
 * `{ type: 'arrow', id }` to each endpoint's `boundElements` (see {@link addBoundRef}).
 * `points` first vertex MUST be `[0, 0]`.
 */
export function makeArrow(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  startId: string;
  endId: string;
  gap?: number;
}): SceneElement {
  const el = base('arrow', opts.x, opts.y, opts.width, opts.height);
  const gap = opts.gap ?? 4;
  return {
    ...el,
    points: [
      [0, 0],
      [opts.width, opts.height],
    ],
    lastCommittedPoint: null,
    startBinding: { elementId: opts.startId, focus: 0, gap },
    endBinding: { elementId: opts.endId, focus: 0, gap },
    startArrowhead: null,
    endArrowhead: 'arrow',
    elbowed: false,
  };
}

/** Reciprocal binding helper: add `{ type, id }` to an element's boundElements (idempotent). */
export function addBoundRef(
  el: SceneElement,
  ref: { type: 'arrow' | 'text'; id: string }
): void {
  const list = Array.isArray(el.boundElements) ? el.boundElements : [];
  if (!list.some((b: { id: string }) => b.id === ref.id)) {
    list.push(ref);
  }
  el.boundElements = list;
}
