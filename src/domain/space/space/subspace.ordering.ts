import { ISpace } from './space.interface';

/**
 * Single source of truth for subspace ordering
 * (workspace#013-spaces-collection-callout, FR-007 / research R2).
 *
 * Orders subspaces:
 *   1. PINNED-first (pinned before unpinned),
 *   2. then `sortOrder` ascending,
 *   3. then `displayName` (case-insensitive) as a stable tiebreaker.
 *
 * Both `SpaceService.getSubspaces` (the `subspaces` field) and the SPACES
 * callout collection (`CalloutFraming.subspaces`) order through this helper so
 * they always agree — the callout preserves the exact order/pins of the static
 * Subspaces block it replaces, and no consumer mutates any subspace
 * `sortOrder`/`pinned` state (FR-016). Returns a new sorted array; the input is
 * not mutated in place beyond `Array.prototype.sort` on a shallow copy.
 */
export const orderSubspaces = <T extends ISpace>(subspaces: T[]): T[] => {
  return [...subspaces].sort((a, b) => {
    // Pinned subspaces first.
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }
    // Then by sortOrder ascending.
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    // Then alphabetically (case-insensitive) as a tiebreaker.
    return (a.about?.profile?.displayName ?? '')
      .toLowerCase()
      .localeCompare((b.about?.profile?.displayName ?? '').toLowerCase());
  });
};
