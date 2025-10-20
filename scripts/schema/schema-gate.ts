#!/usr/bin/env ts-node
// Schema gate script (T029): evaluates change-report.json and exits with non-zero code on violations.
// Exit codes:
// 0: PASS (no blocking changes or override applied appropriately)
// 1: Blocking breaking changes without override
// 2: Premature removal
// 3: Invalid deprecation format
// 4: Unknown / malformed report
// (Multiple violations: highest precedence code >1 chosen, precedence order: 3 > 2 > 1)

import { readFileSync } from 'fs';
import path from 'path';

interface ChangeEntry {
  changeType: string;
  override?: boolean;
}
interface ChangeReportLike {
  overrideApplied: boolean;
  entries: ChangeEntry[];
  classifications?: Record<string, number>;
  errorFallback?: boolean;
  errorMessage?: string;
}

function main() {
  const file = process.argv[2] || 'change-report.json';
  let report: ChangeReportLike | undefined;
  try {
    const raw = readFileSync(path.resolve(file), 'utf-8');
    report = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(
      `Failed to read report '${file}': ${(e as Error).message}\n`
    );
    process.exit(4);
  }
  // If the diff tool emitted a fallback error marker, fail fast and show the
  // provided message so CI logs include the underlying problem.
  if (report && report.errorFallback) {
    const msg = report.errorMessage || 'Schema diff tool reported an error fallback';
    process.stderr.write(`ERROR FALLBACK from change-report: ${msg}\n`);
    process.exit(1);
  }
  if (!report || !Array.isArray(report.entries)) {
    process.stderr.write('Malformed change report: missing entries array\n');
    process.exit(4);
  }
  const breaking = report.entries.filter(e => e.changeType === 'BREAKING');
  const premature = report.entries.filter(
    e => e.changeType === 'PREMATURE_REMOVAL'
  );
  const invalid = report.entries.filter(
    e => e.changeType === 'INVALID_DEPRECATION_FORMAT'
  );

  // Determine if any un-overridden breaking changes are present
  const unoverriddenBreaking = breaking.filter(e => !e.override);

  let exit = 0;
  if (invalid.length) exit = Math.max(exit, 3);
  if (premature.length) exit = Math.max(exit, 2);
  if (unoverriddenBreaking.length) exit = Math.max(exit, 1);

  if (exit === 0) {
    process.stdout.write('Schema gate PASS\n');
  } else {
    if (exit === 1) {
      process.stderr.write(
        `Blocking: ${unoverriddenBreaking.length} breaking change(s) without override\n`
      );
    }
    if (exit === 2) {
      process.stderr.write(
        `Blocking: ${premature.length} premature removal(s)\n`
      );
    }
    if (exit === 3) {
      process.stderr.write(
        `Blocking: ${invalid.length} invalid deprecation format issue(s)\n`
      );
    }
  }
  process.exit(exit);
}

main();
