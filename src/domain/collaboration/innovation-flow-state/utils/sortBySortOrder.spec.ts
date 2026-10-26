import { sortBySortOrder } from './sortBySortOrder';

describe('sortBySortOrder', () => {
  it('should sort items by sortOrder ascending', () => {
    const items = [{ sortOrder: 3 }, { sortOrder: 1 }, { sortOrder: 2 }];
    const sorted = [...items].sort(sortBySortOrder);
    expect(sorted).toEqual([
      { sortOrder: 1 },
      { sortOrder: 2 },
      { sortOrder: 3 },
    ]);
  });

  it('should treat undefined sortOrder as 0', () => {
    const items = [{ sortOrder: 2 }, {}, { sortOrder: 1 }];
    const sorted = [...items].sort(sortBySortOrder);
    expect(sorted).toEqual([{}, { sortOrder: 1 }, { sortOrder: 2 }]);
  });

  it('should return 0 when both items have equal sortOrder', () => {
    expect(sortBySortOrder({ sortOrder: 5 }, { sortOrder: 5 })).toBe(0);
  });

  it('should return negative when a < b', () => {
    expect(sortBySortOrder({ sortOrder: 1 }, { sortOrder: 3 })).toBeLessThan(0);
  });

  it('should return positive when a > b', () => {
    expect(sortBySortOrder({ sortOrder: 5 }, { sortOrder: 2 })).toBeGreaterThan(
      0
    );
  });
});

describe('sortBySortOrder — (sortOrder, id) ordering rule', () => {
  const A1 = 'a1000000-0000-4000-8000-000000000001';
  const B2 = 'b2000000-0000-4000-8000-000000000002';
  const C3 = 'c3000000-0000-4000-8000-000000000003';
  const rank = (states: { id: string; sortOrder: number }[]) =>
    [...states].sort(sortBySortOrder).map(s => s.id);

  const v1 = [
    { id: B2, sortOrder: 10, visible: false },
    { id: A1, sortOrder: 10, visible: true },
    { id: C3, sortOrder: 20, visible: true },
  ];

  it('V1: breaks a sortOrder tie by the lower id', () => {
    expect(rank(v1)).toEqual([A1, B2, C3]);
  });

  it('V2: a hidden first state is still first (visibility is not read)', () => {
    const v2 = [
      { id: B2, sortOrder: 10, visible: true },
      { id: A1, sortOrder: 10, visible: false },
      { id: C3, sortOrder: 20, visible: true },
    ];
    expect(rank(v2)).toEqual([A1, B2, C3]);
  });

  it('V3: uppercase ids are lowercased before comparing', () => {
    const upperB2 = B2.toUpperCase();
    expect(
      rank([
        { id: upperB2, sortOrder: 5 },
        { id: A1, sortOrder: 5 },
      ])
    ).toEqual([A1, upperB2]);
  });

  it('V4: reversed input yields the same ranking', () => {
    expect(rank([...v1].reverse())).toEqual([A1, B2, C3]);
  });

  it('sorts a missing id after a present one on a tie', () => {
    expect(
      [{ sortOrder: 1 }, { id: A1, sortOrder: 1 }].sort(sortBySortOrder)
    ).toEqual([{ id: A1, sortOrder: 1 }, { sortOrder: 1 }]);
  });

  it('sortOrder still dominates the id', () => {
    expect(
      rank([
        { id: A1, sortOrder: 2 },
        { id: C3, sortOrder: 1 },
      ])
    ).toEqual([C3, A1]);
  });
});
