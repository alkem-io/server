/**
 * Auto-placement for `edit_whiteboard_elements`. New elements are placed in EMPTY
 * SPACE below the existing content's bounding box, laid out left-to-right with row
 * wrap — so additions never overlap existing content. Filters `isDeleted` so phantom
 * (deleted) elements never reserve space. Operates on the layout-relevant fields
 * only, so it is agnostic to the fork's full element type.
 */
export interface SceneElement {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isDeleted?: boolean;
  // Placement only reads the geometry fields above; a full element carries more.
  [key: string]: unknown;
}

const GAP = 100; // vertical gap below existing content
const COL_GAP = 40; // horizontal gap between new elements
const MAX_ROW_WIDTH = 1200;

export interface PlacementCursor {
  startX: number;
  startY: number;
  cursorX: number;
  cursorY: number;
  rowHeight: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box of LIVE (non-deleted) elements; null when there are none. */
export function liveBoundingBox(elements: SceneElement[]): BoundingBox | null {
  const live = elements.filter(e => !e.isDeleted);
  if (live.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of live) {
    const x = el.x || 0;
    const y = el.y || 0;
    const w = el.width || 0;
    const h = el.height || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return { minX, minY, maxX, maxY };
}

/** A cursor anchored in empty space below existing content, left-aligned to it. */
export function newCursor(elements: SceneElement[]): PlacementCursor {
  const bb = liveBoundingBox(elements);
  const startX = bb ? bb.minX : 0;
  const startY = bb ? bb.maxY + GAP : 0;
  return { startX, startY, cursorX: startX, cursorY: startY, rowHeight: 0 };
}

/**
 * Place one element at the cursor (mutates `el.x`/`el.y`), then advance. Wraps to
 * a new row once the row exceeds MAX_ROW_WIDTH. For a labelled shape, place the
 * CONTAINER here and re-derive the label offset from the container's final coords.
 */
export function placeAt(c: PlacementCursor, el: SceneElement): void {
  const w = el.width || 200;
  const h = el.height || 100;
  if (c.cursorX - c.startX + w > MAX_ROW_WIDTH && c.cursorX > c.startX) {
    c.cursorX = c.startX;
    c.cursorY += c.rowHeight + COL_GAP;
    c.rowHeight = 0;
  }
  el.x = c.cursorX;
  el.y = c.cursorY;
  c.cursorX += w + COL_GAP;
  c.rowHeight = Math.max(c.rowHeight, h);
}
