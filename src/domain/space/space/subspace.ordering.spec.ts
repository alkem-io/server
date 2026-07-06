import { ISpace } from './space.interface';
import { orderSubspaces } from './subspace.ordering';

// Covers the single subspace-ordering source shared by SpaceService.getSubspaces
// and the SPACES callout collection (workspace#013-spaces-collection-callout,
// FR-007 / SC-003). Pure logic, no DB.
describe('orderSubspaces', () => {
  const subspace = (
    id: string,
    sortOrder: number,
    displayName: string,
    pinned = false
  ): ISpace =>
    ({
      id,
      sortOrder,
      pinned,
      about: { profile: { displayName } },
    }) as unknown as ISpace;

  it('orders pinned subspaces first, then by sortOrder, then displayName', () => {
    const input = [
      subspace('a', 30, 'Alpha'),
      subspace('b', 10, 'Bravo'),
      subspace('c', 20, 'Charlie', true), // pinned
      subspace('d', 5, 'Delta', true), // pinned
    ];

    const ordered = orderSubspaces(input);

    // Pinned first (ordered among themselves by sortOrder: d=5 before c=20),
    // then the unpinned by sortOrder (b=10 before a=30).
    expect(ordered.map(s => s.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('breaks sortOrder ties by displayName (case-insensitive)', () => {
    const input = [
      subspace('a', 10, 'bravo'),
      subspace('b', 10, 'Alpha'),
      subspace('c', 10, 'Charlie'),
    ];

    const ordered = orderSubspaces(input);

    expect(ordered.map(s => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('does NOT mutate the input subspaces sortOrder/pinned (FR-016)', () => {
    const input = [
      subspace('a', 30, 'Alpha'),
      subspace('b', 10, 'Bravo', true),
    ];
    const snapshot = input.map(s => ({
      id: s.id,
      sortOrder: s.sortOrder,
      pinned: s.pinned,
    }));

    orderSubspaces(input);

    expect(
      input.map(s => ({ id: s.id, sortOrder: s.sortOrder, pinned: s.pinned }))
    ).toEqual(snapshot);
  });

  it('returns a new array (does not sort in place)', () => {
    const input = [subspace('a', 20, 'Alpha'), subspace('b', 10, 'Bravo')];
    const ordered = orderSubspaces(input);
    expect(ordered).not.toBe(input);
    // Original order preserved on the input reference.
    expect(input.map(s => s.id)).toEqual(['a', 'b']);
  });
});
