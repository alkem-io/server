export type ChangedLines = Map<string, Set<number>>;
export type CoverageMetric = {
  covered: number;
  total: number;
  percent: number;
};

export function changedLinesFromDiff(diff: string): ChangedLines;
export function changedCoverage(
  coverage: Record<string, unknown>,
  changed: ChangedLines,
  root?: string
): Record<'lines' | 'statements' | 'functions' | 'branches', CoverageMetric>;
export function runReport(
  args: string[],
  dependencies: {
    exec: (
      file: string,
      args: string[],
      options: { encoding: string }
    ) => string;
    read: (path: string, encoding: string) => string;
    root: string;
  }
): { output: string; passed: boolean };
