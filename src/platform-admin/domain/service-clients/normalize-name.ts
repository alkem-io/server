/**
 * Canonical name normalisation for `service_client.name_normalised`.
 *
 * Per Clarifications Session 2026-05-18, the uniqueness key on
 * `service_client.name` is trim + Unicode-default case-fold. This
 * function produces the canonical form used both as the input to the
 * DB uniqueness constraint and as the lookup key for name-collision
 * detection BEFORE issuing the catalogue INSERT.
 *
 * Implementation: `.trim()` strips ASCII / Unicode whitespace from both
 * ends; `.normalize('NFKC')` folds compatibility-equivalent characters
 * (full-width Latin → half-width, ligatures → component letters);
 * `.toLowerCase()` performs locale-independent lowercasing.
 *
 * **DB alignment**: the `service_client.name_normalised` column is
 * generated as `lower(trim(name))` (data-model §1). The TS implementation
 * adds NFKC on top so that, e.g., `Ａnalytics-Pipeline` (full-width A)
 * and `analytics-pipeline` collide application-side BEFORE the INSERT
 * hits the DB. The DB constraint remains the source of truth on the
 * narrower `lower(trim(...))` form; the broader NFKC pre-check is purely
 * a friendlier error path.
 */
export function normalizeName(input: string): string {
  return input.trim().normalize('NFKC').toLowerCase();
}
