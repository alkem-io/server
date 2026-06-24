import { describe, expect, it } from 'vitest';
import type { SceneElement } from './whiteboard-element.factory';
import { liveBoundingBox, newCursor, placeAt } from './whiteboard-placement';

const el = (over: Partial<SceneElement>): SceneElement => ({
  id: Math.random().toString(36).slice(2),
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  isDeleted: false,
  ...over,
});

describe('whiteboard-placement', () => {
  describe('liveBoundingBox', () => {
    it('is null for empty or all-deleted scenes', () => {
      expect(liveBoundingBox([])).toBeNull();
      expect(liveBoundingBox([el({ isDeleted: true })])).toBeNull();
    });

    it('measures only live elements and ignores deleted (no phantom space)', () => {
      const box = liveBoundingBox([
        el({ x: 0, y: 0, width: 300, height: 200 }),
        el({ x: 9000, y: 9000, width: 100, height: 100, isDeleted: true }),
      ]);
      expect(box).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 200 });
    });
  });

  describe('newCursor', () => {
    it('anchors below existing content, left-aligned to it', () => {
      const c = newCursor([el({ x: 10, y: 0, width: 300, height: 200 })]);
      expect(c.startX).toBe(10);
      expect(c.startY).toBe(200 + 100); // maxY + GAP
    });

    it('starts at origin for an empty scene', () => {
      const c = newCursor([]);
      expect(c.startX).toBe(0);
      expect(c.startY).toBe(0);
    });
  });

  describe('placeAt', () => {
    it('places below existing content and never overlaps it', () => {
      const existing = [el({ x: 0, y: 0, width: 300, height: 200 })];
      const cursor = newCursor(existing);
      const placed: SceneElement[] = [];
      for (let i = 0; i < 5; i++) {
        const e = el({ width: 200, height: 100 });
        placeAt(cursor, e);
        placed.push(e);
      }
      // Every placed element sits strictly below the existing content.
      for (const e of placed) {
        expect(e.y).toBeGreaterThanOrEqual(200 + 100);
      }
      // First lands at the cursor origin; second is advanced to the right.
      expect(placed[0].x).toBe(0);
      expect(placed[1].x).toBe(200 + 40); // width + COL_GAP
    });

    it('wraps to a new row past the max row width', () => {
      const cursor = newCursor([]);
      const placed: SceneElement[] = [];
      // 6 x 300-wide elements => exceeds MAX_ROW_WIDTH (1200) and wraps.
      for (let i = 0; i < 6; i++) {
        const e = el({ width: 300, height: 100 });
        placeAt(cursor, e);
        placed.push(e);
      }
      const rows = new Set(placed.map(p => p.y));
      expect(rows.size).toBeGreaterThan(1);
    });
  });
});
