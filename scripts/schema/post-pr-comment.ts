#!/usr/bin/env ts-node
import { readFileSync, existsSync } from 'fs';

interface ChangeEntry {
  changeType: string;
  element: string;
  detail: string;
  override?: boolean;
}
interface ChangeReport {
  classifications: Record<string, number>;
  entries: ChangeEntry[];
  overrideApplied: boolean;
  overrideReviewer?: string;
}

function main() {
  const path = process.argv[2] || 'change-report.json';
  if (!existsSync(path)) {
    process.stdout.write('No change report generated.\n');
    return;
  }
  const report: ChangeReport = JSON.parse(readFileSync(path, 'utf-8'));
  const cls = report.classifications || {};
  const lines: string[] = [];
  lines.push('| Category | Count |');
  lines.push('|----------|-------|');
  const order = [
    'breaking',
    'prematureRemoval',
    'invalidDeprecation',
    'deprecated',
    'additive',
    'info',
  ];
  for (const k of order) {
    if (k in cls) lines.push(`| ${k} | ${cls[k]} |`);
  }
  const breaking = report.entries.filter(e => e.changeType === 'BREAKING');
  const prem = report.entries.filter(e => e.changeType === 'PREMATURE_REMOVAL');
  const invalid = report.entries.filter(
    e => e.changeType === 'INVALID_DEPRECATION_FORMAT'
  );
  const head: string[] = [];
  if (breaking.length) head.push(`${breaking.length} BREAKING`);
  if (prem.length) head.push(`${prem.length} PREMATURE_REMOVAL`);
  if (invalid.length) head.push(`${invalid.length} INVALID_DEPRECATION_FORMAT`);
  if (!head.length) head.push('No blocking changes');
  if (report.overrideApplied)
    head.push(`Override by ${report.overrideReviewer}`);
  process.stdout.write(
    `Schema Diff Summary: ${head.join(' | ')}\n\n${lines.join('\n')}\n`
  );
}

main();
