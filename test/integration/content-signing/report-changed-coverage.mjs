import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const changedLinesFromDiff = diff => {
  const changed = new Map();
  let path;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice(6);
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!path || !hunk) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const lines = changed.get(path) ?? new Set();
    for (let offset = 0; offset < count; offset++) lines.add(start + offset);
    changed.set(path, lines);
  }
  return changed;
};

const metric = () => ({ covered: 0, total: 0 });
const record = (counter, hits) => {
  counter.total++;
  if (hits > 0) counter.covered++;
};

export const changedCoverage = (coverage, changed, root = process.cwd()) => {
  const totals = {
    lines: metric(),
    statements: metric(),
    functions: metric(),
    branches: metric(),
  };
  const filesByPath = new Map(
    Object.values(coverage).map(file => [relative(root, file.path), file])
  );
  for (const [path, changedLines] of changed) {
    const file = filesByPath.get(path);
    if (!file)
      throw new Error(`Coverage JSON is missing changed target: ${path}`);

    const lineHits = new Map();
    for (const [id, location] of Object.entries(file.statementMap)) {
      const line = location.start.line;
      if (!changedLines.has(line)) continue;
      const hits = file.s[id];
      record(totals.statements, hits);
      lineHits.set(line, Math.max(lineHits.get(line) ?? 0, hits));
    }
    for (const hits of lineHits.values()) record(totals.lines, hits);

    for (const [id, fn] of Object.entries(file.fnMap)) {
      if (changedLines.has(fn.decl.start.line))
        record(totals.functions, file.f[id]);
    }
    for (const [id, branch] of Object.entries(file.branchMap)) {
      if (!changedLines.has(branch.line ?? branch.loc.start.line)) continue;
      for (const hits of file.b[id]) record(totals.branches, hits);
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([name, value]) => [
      name,
      {
        ...value,
        percent: value.total ? (100 * value.covered) / value.total : 100,
      },
    ])
  );
};

export const runReport = (args, { exec, read, root }) => {
  const [base, report = 'coverage-ci/coverage-final.json'] = args;
  if (!base)
    throw new Error('usage: report-changed-coverage.mjs BASE [COVERAGE_JSON]');
  const diff = exec(
    'git',
    [
      'diff',
      '--unified=0',
      '--no-color',
      base,
      '--',
      ':(glob)src/**/*.ts',
      ':(exclude,glob)**/*.spec.ts',
      'test/integration/content-signing/report-changed-coverage.mjs',
    ],
    { encoding: 'utf8' }
  );
  const result = changedCoverage(
    JSON.parse(read(report, 'utf8')),
    changedLinesFromDiff(diff),
    root
  );
  return {
    output: JSON.stringify(result, null, 2),
    passed: Object.values(result).every(value => value.percent >= 95),
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = runReport(process.argv.slice(2), {
    exec: execFileSync,
    read: readFileSync,
    root: process.cwd(),
  });
  // biome-ignore lint/suspicious/noConsole: this CLI emits the retained report.
  console.log(report.output);
  if (!report.passed) process.exitCode = 1;
}
