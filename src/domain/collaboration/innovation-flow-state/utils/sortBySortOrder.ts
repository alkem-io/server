/**
 * Plain lowercase string compare of two ids — matches PostgreSQL's `uuid` ordering. Never
 * `localeCompare`, whose collation can disagree with the database. A missing id sorts last.
 */
const compareIds = (a?: string, b?: string): number => {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

/**
 * The one ordering rule for innovation-flow states: `(sortOrder ASC, id ASC)`, over all
 * states regardless of visibility. It is the same rule as the sidebar migrations'
 * `ORDER BY "sortOrder" ASC, id ASC` and the client's `sortBySortOrder`, so "the first
 * state" means the same thing on every layer. Equal sort orders are frequent (partial
 * reorders, inserts), so the id tiebreak is load-bearing — never rely on sort stability.
 */
export const sortBySortOrder = (
  a: { sortOrder?: number; id?: string },
  b: { sortOrder?: number; id?: string }
) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || compareIds(a.id, b.id);
