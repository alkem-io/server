#!/usr/bin/env ts-node
/**
 * Gating script for schema contract enforcement.
 * Reads change-report.json and exits non-zero if policy violations are found unless --no-fail.
 * Policy:
 *  - BREAKING entries require overrideApplied true
 *  - PREMATURE_REMOVAL always fails
 *  - INVALID_DEPRECATION_FORMAT fails
 */
import { readFileSync } from 'node:fs';

interface ChangeEntry { changeType: string; detail: string; }
interface Report {
  overrideApplied: boolean;
  classifications: Record<string, number>;
  entries: ChangeEntry[];
}

const pathArg = process.argv[2] || 'change-report.json';
const shouldFail = process.argv.includes('--fail');

function main() {
  const report: Report = JSON.parse(readFileSync(pathArg, 'utf-8'));
  const breaking = report.entries.filter(e => e.changeType === 'BREAKING');
  const premature = report.entries.filter(e => e.changeType === 'PREMATURE_REMOVAL');
  const invalid = report.entries.filter(e => e.changeType === 'INVALID_DEPRECATION_FORMAT');

  const lines: string[] = [];
  lines.push(`**Override Applied:** ${report.overrideApplied ? '✅ Yes' : '❌ No'}`);
  // Classification table
  const headers = '| Classification | Count |';
  const sep = '|---------------|-------|';
  lines.push('\n**Classification Counts**');
  lines.push(headers);
  lines.push(sep);
  for (const [k, v] of Object.entries(report.classifications)) {
    lines.push(`| ${k} | ${v} |`);
  }

  const section = (title: string, arr: ChangeEntry[]) => {
    if (!arr.length) return; 
    lines.push(`\n**${title} (${arr.length})**`);
    for (const e of arr) lines.push(`- ${e.detail}`);
  };
  section('BREAKING', breaking);
  section('PREMATURE_REMOVAL', premature);
  section('INVALID_DEPRECATION_FORMAT', invalid);

  const violations: string[] = [];
  if (breaking.length && !report.overrideApplied) violations.push(`${breaking.length} breaking change(s) without approved override`);
  if (premature.length) violations.push(`${premature.length} premature removal(s)`);
  if (invalid.length) violations.push(`${invalid.length} invalid deprecation format(s)`);

  lines.push('\n**Gate Status**');
  if (violations.length) {
    lines.push('❌ Violations detected:');
    for (const v of violations) lines.push(`- ${v}`);
  } else {
    lines.push('✅ No violations');
  }

  console.log(lines.join('\n'));
  if (shouldFail && violations.length) {
    console.error('Schema contract gate FAILED');
    process.exit(1);
  }
}

main();
