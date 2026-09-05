import {
  changedCoverage,
  changedLinesFromDiff,
} from './report-changed-coverage.mjs';

describe('content-signing changed coverage report', () => {
  it('extracts only added and rewritten target lines', () => {
    const changed = changedLinesFromDiff(
      ['+++ b/src/example.ts', '@@ -2,0 +3,2 @@', '@@ -9 +11 @@'].join('\n')
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
          1: { line: 9, loc: { start: { line: 9 } } },
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
});
