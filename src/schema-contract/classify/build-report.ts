import { ChangeReport, ElementType, ChangeType } from '../model';
import { randomUUID } from 'node:crypto';
import { indexSDL, DiffContext, sha256 } from '../diff/diff-core';
import { diffTypes } from '../diff/diff-types';
import { diffEnums } from '../diff/diff-enum';
import { diffScalars } from '../diff/diff-scalar';

export function buildChangeReport(
  oldSDL: string,
  newSDL: string,
  ctx: DiffContext
): ChangeReport {
  const oldIdx = indexSDL(oldSDL);
  const newIdx = indexSDL(newSDL);
  diffTypes(oldIdx, newIdx, ctx);
  diffEnums(oldIdx, newIdx, ctx);
  diffScalars(oldIdx, newIdx, ctx);

  const report: ChangeReport = {
    snapshotId: sha256(newSDL),
    baseSnapshotId: sha256(oldSDL),
    generatedAt: new Date().toISOString(),
    classifications: ctx.counts,
    entries: ctx.entries,
    overrideApplied: false,
  } as any;

  if (ctx.scalarEvaluations?.length)
    (report as any).scalarEvaluations = ctx.scalarEvaluations;

  return report;
}

export function buildBaselineReport(newSDL: string): ChangeReport {
  return {
    snapshotId: sha256(newSDL),
    baseSnapshotId: null,
    generatedAt: new Date().toISOString(),
    classifications: {
      additive: 0,
      deprecated: 0,
      breaking: 0,
      prematureRemoval: 0,
      invalidDeprecation: 0,
      info: 0,
      baseline: 1,
    },
    entries: [
      {
        id: randomUUID(),
        element: 'SCHEMA',
        elementType: ElementType.TYPE,
        changeType: ChangeType.BASELINE,
        detail: 'Initial baseline snapshot created',
      },
    ],
    overrideApplied: false,
  };
}
