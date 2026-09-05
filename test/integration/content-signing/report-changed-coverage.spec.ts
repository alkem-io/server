import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  changedCoverage,
  changedLinesFromDiff,
  runReport,
} from './report-changed-coverage.mjs';

describe('content-signing changed coverage report', () => {
  it('extracts only added and rewritten target lines', () => {
    const changed = changedLinesFromDiff(
      [
        'diff header',
        '+++ b/src/example.ts',
        '@@ -2,0 +3,2 @@',
        '@@ -9 +11 @@',
      ].join('\n')
    );
    expect([...changed.get('src/example.ts')!]).toEqual([3, 4, 11]);
  });

  it('counts changed executable denominators and uncovered branches', () => {
    const changed = new Map([['src/example.ts', new Set([3, 4])]]);
    const coverage = {
      example: {
        path: `${process.cwd()}/src/example.ts`,
        statementMap: {
          0: { start: { line: 3 } },
          1: { start: { line: 4 } },
          2: { start: { line: 9 } },
        },
        fnMap: {
          0: { decl: { start: { line: 3 } } },
          1: { decl: { start: { line: 9 } } },
        },
        branchMap: {
          0: { line: 4, loc: { start: { line: 4 } } },
          1: { loc: { start: { line: 9 } } },
        },
        s: { 0: 2, 1: 0, 2: 0 },
        f: { 0: 1, 1: 0 },
        b: { 0: [1, 0], 1: [0, 0] },
      },
    };

    expect(changedCoverage(coverage, changed)).toEqual({
      lines: { covered: 1, total: 2, percent: 50 },
      statements: { covered: 1, total: 2, percent: 50 },
      functions: { covered: 1, total: 1, percent: 100 },
      branches: { covered: 1, total: 2, percent: 50 },
    });
  });

  it('fails when an intended changed target is absent from coverage JSON', () => {
    expect(() =>
      changedCoverage({}, new Map([['src/missing.ts', new Set([1])]]))
    ).toThrow('Coverage JSON is missing changed target: src/missing.ts');
  });

  it('reports explicit targets and fails any metric below 95', () => {
    const coverage = {
      example: {
        path: `${process.cwd()}/src/example.ts`,
        statementMap: { 0: { start: { line: 3 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 0 },
        f: {},
        b: {},
      },
    };
    const read = vi.fn(() => JSON.stringify(coverage));
    const exec = vi.fn(() => '+++ b/src/example.ts\n@@ -2 +3 @@');

    const report = runReport(['base'], {
      exec,
      read,
      root: process.cwd(),
    });

    expect(report.passed).toBe(false);
    expect(JSON.parse(report.output).statements.percent).toBe(0);
    expect(read).toHaveBeenCalledWith(
      'coverage-ci/coverage-final.json',
      'utf8'
    );
    expect(exec).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining([
        ':(glob)src/**/*.ts',
        ':(exclude,glob)**/*.spec.ts',
        'test/integration/content-signing/report-changed-coverage.mjs',
      ]),
      { encoding: 'utf8' }
    );
  });

  it('requires a base revision and passes an empty explicit target set', () => {
    const dependencies = {
      exec: vi.fn(() => ''),
      read: vi.fn(() => '{}'),
      root: process.cwd(),
    };

    expect(() => runReport([], dependencies)).toThrow(
      'usage: report-changed-coverage.mjs BASE [COVERAGE_JSON]'
    );
    expect(runReport(['base', 'report.json'], dependencies).passed).toBe(true);
  });

  it('executes the CLI entry point and emits its retained report', async () => {
    const fixture = mkdtempSync(join(tmpdir(), 'changed-coverage-'));
    const helper = join(
      process.cwd(),
      'test/integration/content-signing/report-changed-coverage.mjs'
    );
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      writeFileSync(join(fixture, 'report.json'), '{}');

      process.argv = [
        process.execPath,
        helper,
        'HEAD',
        join(fixture, 'report.json'),
      ];
      await import(`${pathToFileURL(helper).href}?cli=${Date.now()}`);

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('"percent": 100')
      );
      expect(process.exitCode).not.toBe(1);
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      log.mockRestore();
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
