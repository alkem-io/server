import { describe, expect, it } from 'vitest';
import {
  addBoundRef,
  makeArrow,
  makeLabelledShape,
  makeShape,
  makeText,
} from './whiteboard-element.factory';

describe('whiteboard-element.factory', () => {
  describe('makeShape', () => {
    for (const shape of ['rectangle', 'ellipse', 'diamond'] as const) {
      it(`builds a valid ${shape} (version >= 1, real size, not deleted)`, () => {
        const el = makeShape({ shape, x: 5, y: 6, width: 120, height: 80 });
        expect(el.type).toBe(shape);
        expect(el.id).toBeTruthy();
        expect(el.version).toBeGreaterThanOrEqual(1);
        expect(el.width).toBeGreaterThan(0);
        expect(el.height).toBeGreaterThan(0);
        expect(el.isDeleted).toBe(false);
      });
    }

    it('rounds rectangle corners only', () => {
      expect(
        makeShape({ shape: 'rectangle', x: 0, y: 0, width: 10, height: 10 })
          .roundness
      ).toEqual({
        type: 3,
      });
      expect(
        makeShape({ shape: 'ellipse', x: 0, y: 0, width: 10, height: 10 })
          .roundness
      ).toBeNull();
    });

    it('honors fill + stroke color', () => {
      const el = makeShape({
        shape: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fillColor: '#a5d8ff',
        strokeColor: '#1971c2',
      });
      expect(el.backgroundColor).toBe('#a5d8ff');
      expect(el.strokeColor).toBe('#1971c2');
    });
  });

  describe('makeText', () => {
    it('uses the numeric font family + correct line height, text === originalText', () => {
      const el = makeText({ text: 'Hello', x: 0, y: 0, width: 50, height: 25 });
      expect(el.fontFamily).toBe(5);
      expect(typeof el.fontFamily).toBe('number');
      expect(el.lineHeight).toBe(1.25);
      expect(el.text).toBe('Hello');
      expect(el.originalText).toBe('Hello');
      expect(el.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe('makeLabelledShape', () => {
    it('returns [container, text] with reciprocal binding', () => {
      const [container, text] = makeLabelledShape({
        shape: 'rectangle',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        label: 'Start',
      });
      expect(container.boundElements).toEqual([{ type: 'text', id: text.id }]);
      expect(text.containerId).toBe(container.id);
      expect(text.textAlign).toBe('center');
      expect(text.verticalAlign).toBe('middle');
    });
  });

  describe('makeArrow', () => {
    it('points start at [0,0], binds both ends, arrowhead on the end', () => {
      const arrow = makeArrow({
        x: 0,
        y: 0,
        width: 100,
        height: 0,
        startId: 'a',
        endId: 'b',
      });
      expect(arrow.points[0]).toEqual([0, 0]);
      expect(arrow.points.length).toBe(2);
      expect(arrow.endArrowhead).toBe('arrow');
      expect(arrow.startBinding.elementId).toBe('a');
      expect(arrow.endBinding.elementId).toBe('b');
      expect(arrow.startBinding.focus).toBe(0);
      expect(arrow.endBinding.gap).toBeGreaterThanOrEqual(1);
    });
  });

  describe('addBoundRef', () => {
    it('appends and is idempotent by id', () => {
      const el = makeShape({
        shape: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
      addBoundRef(el, { type: 'arrow', id: 'arr-1' });
      addBoundRef(el, { type: 'arrow', id: 'arr-1' });
      expect(el.boundElements).toEqual([{ type: 'arrow', id: 'arr-1' }]);
    });
  });
});
