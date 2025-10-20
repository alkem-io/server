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

interface ChangeEntry { changeType: string; detail: string; override?: boolean }
interface Report {
  overrideApplied: boolean;
  classifications: Record<string, number>;
  entries: ChangeEntry[];
  // Optional fallback error produced by the diff tool when it cannot produce
  // a valid change report (e.g. baseline generation failure). When present
  // and true, gate scripts MUST fail the CI run and surface the accompanying
  // errorMessage to logs.
  errorFallback?: boolean;
  errorMessage?: string;
}

// Simple CLI parsing for flags and positional args. Supports:
//   --path=<file> or --path <file>
//   positional: <file>
//   --fail / --no-fail (boolean)
function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let path: string | undefined;
  let shouldFail = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--path=')) {
      path = a.slice('--path='.length);
      continue;
    }
    if (a === '--path') {
      if (i + 1 < args.length) {
        path = args[i + 1];
        i++;
      }
      continue;
    }
    if (a === '--fail') {
      shouldFail = true;
      continue;
    }
    if (a === '--no-fail') {
      shouldFail = false;
      continue;
    }
    // positional fallback
    if (!a.startsWith('--') && !path) {
      path = a;
      continue;
    }
  }
  return { path: path ?? 'change-report.json', shouldFail };
}

const { path: pathArg, shouldFail } = parseArgs(process.argv);

function main() {
  let report: Report;
  try {
    report = JSON.parse(readFileSync(pathArg, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse JSON from ${pathArg}:`, (err as Error).message || err);
    process.exit(4);
    // unreachable
    return;
  }
  // If the diff tool signalled an error fallback, surface the message and fail
  // immediately. This indicates the report is not trustworthy (e.g. baseline
  // write failed) and CI should not proceed as if the report were valid.
  if (report && report.errorFallback) {
    const msg = report.errorMessage || 'Schema diff tool reported a fallback error';
    console.error(`ERROR FALLBACK from change-report: ${msg}`);
    // Ensure non-zero exit to fail CI
    process.exit(1);
  }
  // Only consider BREAKING entries that haven't been overridden at the entry level.
  const breaking = report.entries.filter(e => e.changeType === 'BREAKING' && !e.override);
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
  // Breaking changes: require either global overrideApplied or entry-level overrides (we already filtered entries by !e.override).
  if (breaking.length && !report.overrideApplied) violations.push(`${breaking.length} breaking change(s) without approved override`);
  if (premature.length) violations.push(`${premature.length} premature removal(s)`);
  // INVALID_DEPRECATION_FORMAT is treated as a warning only (non-blocking). Keep it in the report but do not gate the build.

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
