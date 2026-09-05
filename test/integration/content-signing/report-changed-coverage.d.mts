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
