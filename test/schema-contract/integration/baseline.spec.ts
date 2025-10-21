import {
  baselineReport,
  indexSDL,
  createDiffContext,
} from '../../../src/schema-contract/diff/diff-core';
import { diffEnums } from '../../../src/schema-contract/diff/diff-enum';
import { diffScalars } from '../../../src/schema-contract/diff/diff-scalar';
import { ChangeType } from '../../../src/schema-contract/model';

// T046: Integration baseline scenario
// Simulates no previous snapshot: expect a baseline report (single BASELINE entry) when generating new snapshot.

// NOTE: The baselineReport function is used when there is *no prior snapshot file*.
// Here we assert that diffing with an empty previous schema should produce only additive or deprecated etc (not baseline),
// while the explicit baselineReport carries the BASELINE entry.

function runDiff(oldSDL: string, newSDL: string) {
  const oldIdx = indexSDL(oldSDL);
  const newIdx = indexSDL(newSDL);
  const ctx = createDiffContext([]);
  diffEnums(oldIdx, newIdx, ctx);
  diffScalars(oldIdx, newIdx, ctx);
  return ctx;
}

describe('Baseline integration', () => {
  it('produces BASELINE report when no previous snapshot exists', () => {
    const sdl = 'enum Example { A }\nscalar ExampleScalar';
    const report = baselineReport(sdl);
    expect(report.entries.some(e => e.changeType === ChangeType.BASELINE)).toBe(
      true
    );
    expect(report.overrideApplied).toBe(false);
  });

  it('diff without baseline produces additive entries (not baseline)', () => {
    const newSDL = 'enum Example { A B }\nscalar Added';
    const ctx = runDiff('', newSDL);
    expect(ctx.entries.some(e => e.changeType === ChangeType.BASELINE)).toBe(
      false
    );
    // Should have at least 2 additive entries: enum Example (added) and scalar Added (added) and value B
    const additive = ctx.entries.filter(
      e => e.changeType === ChangeType.ADDITIVE
    );
    expect(additive.length).toBeGreaterThanOrEqual(2);
  });
});
