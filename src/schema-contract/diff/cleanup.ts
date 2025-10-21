// Shared lightweight diff helpers for schema-contract feature.
// Intent: reduce small duplicated patterns (forming union of record keys etc.)

/**
 * Return a Set containing the union of all keys of the provided record objects.
 * Undefined / null inputs are ignored.
 */
export function unionKeys<T extends Record<string, any>>(
  ...records: Array<T | undefined | null>
): Set<string> {
  const s = new Set<string>();
  for (const r of records) {
    if (!r) continue;
    for (const k of Object.keys(r)) s.add(k);
  }
  return s;
}
