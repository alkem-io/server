/**
 * Comparison-time normalization for the display-label duplicate guard
 * (FR-011c): trim, collapse internal whitespace runs, Unicode-normalize
 * (NFC), and case-fold. So `"SDGs"`, `"sdgs"` and `"SDGs "` all compare
 * equal.
 *
 * Used **only** at comparison time — the stored `displayLabel` always keeps
 * the author's exact casing and spacing (S-8). Never write this function's
 * output back to the entity.
 *
 * Scoped to `domain/space/classification.entry` because the guard it serves
 * (I-5) only ever compares entries on the same `SpaceAbout` — no other
 * module needs it.
 */
export function normalizeClassificationLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase();
}
