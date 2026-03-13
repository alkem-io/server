import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyOverrides } from '../../../src/schema-contract/governance/apply-overrides';
import {
  ChangeEntry,
  ChangeReport,
  ChangeType,
  ElementType,
} from '../../../src/schema-contract/model';

// T045: Override governance flow tests

describe('applyOverrides governance', () => {
  let tmpDir: string;
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'override-gov-'));
    origEnv.SCHEMA_OVERRIDE_REVIEWS_JSON =
      process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    origEnv.SCHEMA_OVERRIDE_CODEOWNERS_PATH =
      process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  const makeReport = (entries: Partial<ChangeEntry>[]): ChangeReport => ({
    snapshotId: 'new',
    baseSnapshotId: 'old',
    generatedAt: new Date().toISOString(),
    classifications: {
      additive: 0,
      deprecated: 0,
      breaking: entries.filter(e => e.changeType === ChangeType.BREAKING)
        .length,
      prematureRemoval: 0,
      invalidDeprecation: 0,
      info: 0,
      baseline: 0,
    },
    entries: entries.map(e => ({
      id: e.id || 'id-' + Math.random().toString(36).slice(2),
      element: e.element || 'Type.field',
      elementType: e.elementType || ElementType.FIELD,
      changeType: e.changeType || ChangeType.BREAKING,
      detail: e.detail || 'Breaking change',
    })) as ChangeEntry[],
    overrideApplied: false,
  });

  it('does not apply override when no reviews', () => {
    const codeownersPath = join(tmpDir, 'CODEOWNERS');
    writeFileSync(codeownersPath, '* @alice');
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = codeownersPath;
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = '[]';

    const report = makeReport([{}]);
    const res = applyOverrides(report);
    expect(res.applied).toBe(false);
    expect(report.overrideApplied).toBe(false);
  });

  it('applies override with owner review containing phrase', () => {
    const reviewJson = JSON.stringify([
      { reviewer: 'alice', body: 'LGTM BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    const codeownersPath = join(tmpDir, 'CODEOWNERS');
    writeFileSync(codeownersPath, '* @alice');
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = codeownersPath;
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = reviewJson;

    const report = makeReport([{}]);
    const res = applyOverrides(report);
    expect(res.applied).toBe(true);
    expect(report.overrideApplied).toBe(true);
    const breaking = report.entries.filter(
      e => e.changeType === ChangeType.BREAKING
    );
    expect(breaking.every(b => (b as any).override === true)).toBe(true);
  });

  it('ignores review without phrase', () => {
    const reviewJson = JSON.stringify([
      { reviewer: 'alice', body: 'LGTM', state: 'APPROVED' },
    ]);
    const codeownersPath = join(tmpDir, 'CODEOWNERS');
    writeFileSync(codeownersPath, '* @alice');
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = codeownersPath;
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = reviewJson;

    const report = makeReport([{}]);
    const res = applyOverrides(report);
    expect(res.applied).toBe(false);
    expect(report.overrideApplied).toBe(false);
  });
});
