export const sortBySortOrder = (
  a: { sortOrder?: number },
  b: { sortOrder?: number }
) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
