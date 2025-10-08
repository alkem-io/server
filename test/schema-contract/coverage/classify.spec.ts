import {
  buildChangeReport,
  buildBaselineReport,
} from '@src/schema-contract/classify/build-report';
import { createDiffContext } from '@src/schema-contract/diff/diff-core';
import { ChangeType } from '@src/schema-contract/model';

describe('schema-contract classify: build reports', () => {
  const oldSDL = 'type A { a: String b: Int }';
  const newSDL = 'type A { a: String b: Int c: String }\nscalar S';

  it('buildChangeReport produces additive entry and copies counts', () => {
    const ctx = createDiffContext();
    const report = buildChangeReport(oldSDL, newSDL, ctx);
    // Expect at least one additive change (field or scalar added)
    expect(report.entries.some(e => e.changeType === ChangeType.ADDITIVE)).toBe(
      true
    );
    expect(report.classifications.additive).toBeGreaterThan(0);
    expect(report.snapshotId).not.toBe(report.baseSnapshotId);
  });

  it('buildBaselineReport sets baseline classification', () => {
    const baseline = buildBaselineReport(newSDL);
    expect(baseline.baseSnapshotId).toBeNull();
    expect(baseline.entries[0].changeType).toBe(ChangeType.BASELINE);
  });
});
