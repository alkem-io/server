import {
  indexSDL,
  createDiffContext,
} from '../../../src/schema-contract/diff/diff-core';
import { diffScalars } from '../../../src/schema-contract/diff/diff-scalar';
import { ChangeType } from '../../../src/schema-contract/model';

// T044: Scalar jsonType classification tests

describe('diffScalars jsonType classification', () => {
  const wrap = (lines: string[]) => lines.join('\n');

  it('classifies added scalar with directive jsonType', () => {
    const oldIdx = indexSDL(wrap([]));
    const newIdx = indexSDL(
      wrap(['scalar DateISO @scalarMeta(jsonType: "string")'])
    );
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'DateISO');
    expect(entry?.changeType).toBe(ChangeType.ADDITIVE);
    expect(entry?.current?.jsonType).toBe('string');
  });

  it('infers jsonType by name heuristic', () => {
    const oldIdx = indexSDL('');
    const newIdx = indexSDL('scalar CustomFloat');
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'CustomFloat');
    expect(entry?.current?.jsonType).toBe('number');
  });

  it('detects jsonType change as BREAKING', () => {
    const oldIdx = indexSDL('scalar Amount @scalarMeta(jsonType: "number")');
    const newIdx = indexSDL('scalar Amount @scalarMeta(jsonType: "string")');
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e => e.element === 'Amount' && e.changeType === ChangeType.BREAKING
    );
    expect(entry).toBeDefined();
    expect(entry?.previous?.jsonType).toBe('number');
    expect(entry?.current?.jsonType).toBe('string');
  });

  it('emits INFO when description changes without jsonType change', () => {
    const oldIdx = indexSDL(
      '"Amount in cents"\nscalar Amount @scalarMeta(jsonType: "number")'
    );
    const newIdx = indexSDL(
      '"Updated description"\nscalar Amount @scalarMeta(jsonType: "number")'
    );
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const info = ctx.entries.find(
      e => e.element === 'Amount' && e.changeType === ChangeType.INFO
    );
    expect(info).toBeDefined();
  });

  it('marks removal as BREAKING', () => {
    const oldIdx = indexSDL('scalar LegacyID');
    const newIdx = indexSDL('');
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e => e.element === 'LegacyID' && e.changeType === ChangeType.BREAKING
    );
    expect(entry).toBeDefined();
    expect(entry?.previous?.jsonType).toBeDefined();
  });

  it('retains unknown when heuristic cannot classify', () => {
    const oldIdx = indexSDL('');
    const newIdx = indexSDL('scalar MysteryX');
    const ctx = createDiffContext([]);
    diffScalars(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'MysteryX');
    expect(entry?.current?.jsonType).toBe('unknown');
  });
});
