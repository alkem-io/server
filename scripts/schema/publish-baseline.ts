#!/usr/bin/env ts-node
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { EOL } from 'os';
import { resolve } from 'path';

type ClassificationKey =
  | 'baseline'
  | 'breaking'
  | 'prematureRemoval'
  | 'invalidDeprecation'
  | 'deprecated'
  | 'additive'
  | 'info';

type ChangeType =
  | 'BASELINE'
  | 'BREAKING'
  | 'DEPRECATION'
  | 'PREMATURE_REMOVAL'
  | 'INVALID_DEPRECATION_FORMAT'
  | 'ADDITIVE'
  | string;

interface ChangeEntry {
  detail: string;
  element: string;
  changeType: ChangeType;
}

interface ChangeReport {
  generatedAt: string;
  snapshotId: string;
  baseSnapshotId: string | null;
  classifications: Partial<Record<ClassificationKey, number>>;
  entries: ChangeEntry[];
  overrideApplied?: boolean;
  overrideReviewer?: string;
  errorFallback?: boolean;
  errorMessage?: string;
}

function appendOutput(name: string, value: string) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  appendFileSync(output, `${name}=${value}${EOL}`);
}

function appendSummary(lines: string[]) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  appendFileSync(summary, `${lines.join(EOL)}${EOL}`);
}

function updateFailureContext(message: string) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) return;
  appendFileSync(envFile, `BASELINE_FAILURE_CONTEXT=${message}${EOL}`);
}

function main() {
  const reportPath = resolve(
    process.cwd(),
    process.argv[2] || 'change-report.json'
  );
  if (!existsSync(reportPath)) {
    console.error(`No change report found at ${reportPath}`);
    updateFailureContext(
      'change-report.json was not generated. Inspect diff step output.'
    );
    process.exit(1);
  }

  const report: ChangeReport = JSON.parse(readFileSync(reportPath, 'utf-8'));
  const cls = report.classifications || {};

  const categoryOrder: { key: ClassificationKey; label: string }[] = [
    { key: 'breaking', label: 'Breaking' },
    { key: 'prematureRemoval', label: 'Premature Removal' },
    { key: 'invalidDeprecation', label: 'Invalid Deprecation' },
    { key: 'deprecated', label: 'Deprecations' },
    { key: 'additive', label: 'Additive' },
    { key: 'info', label: 'Informational' },
    { key: 'baseline', label: 'Baseline' },
  ];

  const totals = categoryOrder.reduce<Record<string, number>>(
    (acc, { key }) => {
      acc[key] = cls[key] ?? 0;
      return acc;
    },
    {}
  );

  const changeCount =
    totals.additive +
    totals.deprecated +
    totals.breaking +
    totals.prematureRemoval +
    totals.invalidDeprecation +
    totals.info;

  const hasBaselineInit = totals.baseline > 0 && changeCount === 0;
  const hasDiffEntries = changeCount > 0;
  const blockingIssues =
    totals.breaking + totals.prematureRemoval + totals.invalidDeprecation > 0;

  const topEntries = (report.entries || [])
    .filter(entry => entry.changeType !== 'BASELINE')
    .slice(0, 5)
    .map(
      entry => `- **${entry.changeType}** · ${entry.element} – ${entry.detail}`
    );

  let headerStatus = 'No schema changes detected; baseline remains unchanged.';
  if (hasBaselineInit) {
    headerStatus = 'Initialized schema baseline snapshot.';
  } else if (hasDiffEntries) {
    headerStatus = 'Schema baseline changed; commit will be generated.';
  }

  const lines: string[] = [
    '## Schema baseline summary',
    '',
    headerStatus,
    '',
    `Generated at: ${report.generatedAt}`,
    `Snapshot hash: ${report.snapshotId}`,
  ];

  if (report.baseSnapshotId) {
    lines.push(`Previous snapshot hash: ${report.baseSnapshotId}`);
  }

  lines.push('', '| Category | Count |', '|----------|-------|');
  for (const { key, label } of categoryOrder) {
    if (totals[key] !== undefined) {
      lines.push(`| ${label} | ${totals[key]} |`);
    }
  }

  if (report.overrideApplied && report.overrideReviewer) {
    lines.push(
      '',
      `> Override applied by ${report.overrideReviewer}; review governance decision logs.`
    );
  }

  if (topEntries.length) {
    lines.push('', '### Representative changes', '', ...topEntries);
  }

  if (blockingIssues) {
    lines.push(
      '',
      '> ⚠️ Blocking changes detected. Review before accepting downstream consumers.'
    );
  }

  if (report.errorFallback) {
    lines.push(
      '',
      '> ❌ Diff generation fell back to a placeholder report. Inspect workflow logs immediately.'
    );
  }

  appendSummary(lines);

  const baselineChanged = hasBaselineInit || hasDiffEntries;
  appendOutput('baseline_changed', baselineChanged ? 'true' : 'false');
  appendOutput('baseline_initialized', hasBaselineInit ? 'true' : 'false');
  appendOutput('blocking_changes', blockingIssues ? 'true' : 'false');
  appendOutput('diff_entry_count', String(report.entries?.length ?? 0));

  if (report.errorFallback) {
    updateFailureContext(
      report.errorMessage
        ? `Schema diff fallback triggered: ${report.errorMessage}`
        : 'Schema diff fallback triggered. Check logs for details.'
    );
    process.exit(1);
  }
}

main();
