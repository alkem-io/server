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
