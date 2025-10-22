/** Apply overrides to a ChangeReport (T028)
 * Aggregates CODEOWNERS + reviews ingestion to mark breaking changes overridden.
 */
import { ChangeReport, ChangeEntry, ChangeType } from '../model';
import { parseCodeOwnersFile, collectAllOwners } from './codeowners';
import { loadReviews, evaluateOverride } from './reviews';

export interface OverrideResult {
  applied: boolean;
  reviewer?: string;
  details: string[];
}

export function applyOverrides(report: ChangeReport): OverrideResult {
  const entries = parseCodeOwnersFile(
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH || 'CODEOWNERS'
  );
  const owners = collectAllOwners(entries);
  const reviews = loadReviews();
  const evaluation = evaluateOverride(owners, reviews);
  if (!evaluation.applied) return evaluation;
  // Mark report & breaking entries with override flag
  report.overrideApplied = true;
  (report as any).overrideReviewer = evaluation.reviewer;
  report.entries = report.entries.map((e: ChangeEntry) =>
    e.changeType === ChangeType.BREAKING ? { ...e, override: true } : e
  );
  return evaluation;
}
