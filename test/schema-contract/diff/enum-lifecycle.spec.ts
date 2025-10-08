import {
  indexSDL,
  createDiffContext,
} from '../../../src/schema-contract/diff/diff-core';
import { diffEnums } from '../../../src/schema-contract/diff/diff-enum';
import { ChangeType } from '../../../src/schema-contract/model';

// T043: Enum lifecycle evaluation tests
// We simulate previous deprecations via ctx.previousDeprecations when needed.

describe('diffEnums lifecycle', () => {
  // Helper to build multi-line enum SDL deterministically
  function enumSDL(values: string[]): string {
    return ['enum Status {', ...values, '}'].join('\n');
  }

  const baseEnum = (values: string[]) => enumSDL(values);

  const deprecatedVal = (
    name: string,
    removeAfter?: string,
    reason = 'Cleanup'
  ) => {
    if (!removeAfter) return `${name}`; // no directive
    // GraphQL string literals must use double quotes; single quotes trigger a syntax error.
    return `${name} @deprecated(reason: "REMOVE_AFTER=${removeAfter} | ${reason}")`;
  };

  it('detects added enum value as ADDITIVE', () => {
    const oldIdx = indexSDL(baseEnum(['A']));
    const newIdx = indexSDL(baseEnum(['A', 'B']));
    const ctx = createDiffContext([]);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element.endsWith('.B'));
    expect(entry?.changeType).toBe(ChangeType.ADDITIVE);
  });

  it('detects deprecation of existing value', () => {
    const oldIdx = indexSDL(baseEnum(['A', 'B']));
    const newIdx = indexSDL(baseEnum(['A', deprecatedVal('B', '2025-12-31')]));
    const ctx = createDiffContext([]);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e => e.element === 'Status.B' && e.changeType === ChangeType.DEPRECATED
    );
    expect(entry).toBeDefined();
    expect(entry?.removeAfter).toBe('2025-12-31');
  });

  it('flags invalid deprecation format', () => {
    const oldIdx = indexSDL(baseEnum(['A', 'B']));
    // Missing REMOVE_AFTER= prefix
    const newIdx = indexSDL(
      enumSDL(['A', 'B @deprecated(reason: "2025-12-31 | Missing prefix")'])
    );
    const ctx = createDiffContext([]);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e =>
        e.element === 'Status.B' &&
        e.changeType === ChangeType.INVALID_DEPRECATION_FORMAT
    );
    expect(entry).toBeDefined();
  });

  it('removal without deprecation is BREAKING', () => {
    const oldIdx = indexSDL(baseEnum(['A', 'B']));
    const newIdx = indexSDL(baseEnum(['A']));
    const ctx = createDiffContext([]);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(
      e => e.element === 'Status.B' && e.changeType === ChangeType.BREAKING
    );
    expect(entry).toBeDefined();
  });

  it('premature removal before removeAfter date', () => {
    // Value B previously deprecated with removeAfter in future
    const previousDeprecations = [
      {
        element: 'Status.B',
        sinceDate: '2025-08-01',
        removeAfter: '2025-12-31',
      } as any,
    ];
    const oldIdx = indexSDL(baseEnum(['A', deprecatedVal('B', '2025-12-31')]));
    const newIdx = indexSDL(baseEnum(['A']));
    const ctx = createDiffContext(previousDeprecations);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'Status.B');
    expect(entry?.changeType).toBe(ChangeType.PREMATURE_REMOVAL);
  });

  it('breaking removal after removeAfter but before 90-day window', () => {
    const previousDeprecations = [
      {
        element: 'Status.B',
        sinceDate: '2025-09-15', // <90 days elapsed
        removeAfter: '2025-10-01', // removeAfter passed
      } as any,
    ];
    const oldIdx = indexSDL(baseEnum(['A', deprecatedVal('B', '2025-10-01')]));
    const newIdx = indexSDL(baseEnum(['A']));
    const ctx = createDiffContext(previousDeprecations);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'Status.B');
    expect(entry?.changeType).toBe(ChangeType.BREAKING); // window met but <90-day => BREAKING per logic
  });

  it('info removal after removeAfter and >=90 days', () => {
    const previousDeprecations = [
      {
        element: 'Status.B',
        sinceDate: '2025-06-01', // >90 days
        removeAfter: '2025-08-01', // past
      } as any,
    ];
    const oldIdx = indexSDL(baseEnum(['A', deprecatedVal('B', '2025-08-01')]));
    const newIdx = indexSDL(baseEnum(['A']));
    const ctx = createDiffContext(previousDeprecations);
    diffEnums(oldIdx, newIdx, ctx);
    const entry = ctx.entries.find(e => e.element === 'Status.B');
    expect(entry?.changeType).toBe(ChangeType.INFO);
  });
});
