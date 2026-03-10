import fs from 'fs';
import { applyOverrides } from '../../../src/schema-contract/governance/apply-overrides';
import {
  ChangeEntry,
  ChangeReport,
  ChangeType,
  ElementType,
} from '../../../src/schema-contract/model';

// T045: Override governance flow tests

describe('applyOverrides governance', () => {
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

  const withEnv = (env: Record<string, string>, fn: () => void) => {
    const prev: Record<string, string | undefined> = {};
    for (const k of Object.keys(env)) {
      prev[k] = process.env[k];
      process.env[k] = env[k];
    }
    try {
      fn();
    } finally {
      for (const k of Object.keys(env)) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  };

  it('does not apply override when no reviews', () => {
    const report = makeReport([{}]);
    withEnv({ SCHEMA_OVERRIDE_REVIEWS_JSON: '[]' }, () => {
      const res = applyOverrides(report);
      expect(res.applied).toBe(false);
      expect(report.overrideApplied).toBe(false);
    });
  });

  it('applies override with owner review containing phrase', () => {
    const reviewJson = JSON.stringify([
      { reviewer: 'alice', body: 'LGTM BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    const codeownersContent = '* @alice';
    const tmpPath = 'CODEOWNERS';
    fs.writeFileSync(tmpPath, codeownersContent);
    try {
      const report = makeReport([{}]);
      withEnv({ SCHEMA_OVERRIDE_REVIEWS_JSON: reviewJson }, () => {
        const res = applyOverrides(report);
        expect(res.applied).toBe(true);
        expect(report.overrideApplied).toBe(true);
        const breaking = report.entries.filter(
          e => e.changeType === ChangeType.BREAKING
        );
        expect(breaking.every(b => (b as any).override === true)).toBe(true);
      });
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  it('ignores review without phrase', () => {
    const reviewJson = JSON.stringify([
      { reviewer: 'alice', body: 'LGTM', state: 'APPROVED' },
    ]);
    const codeownersContent = '* @alice';
    const tmpPath = 'CODEOWNERS';
    fs.writeFileSync(tmpPath, codeownersContent);
    try {
      const report = makeReport([{}]);
      withEnv({ SCHEMA_OVERRIDE_REVIEWS_JSON: reviewJson }, () => {
        const res = applyOverrides(report);
        expect(res.applied).toBe(false);
        expect(report.overrideApplied).toBe(false);
      });
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});
