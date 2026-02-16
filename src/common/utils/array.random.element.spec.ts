import { arrayRandomElement } from './array.random.element';

describe('arrayRandomElement', () => {
  it('should return the only element from a single-element array', () => {
    expect(arrayRandomElement([42])).toBe(42);
  });

  it('should return an element that exists in the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = arrayRandomElement(arr);
    expect(arr).toContain(result);
  });

  it('should work with string arrays', () => {
    const arr = ['a', 'b', 'c'];
    const result = arrayRandomElement(arr);
    expect(arr).toContain(result);
  });

  it('should work with object arrays', () => {
    const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = arrayRandomElement(objs);
    expect(objs).toContain(result);
  });

  it('should return undefined for an empty array', () => {
    const result = arrayRandomElement([]);
    expect(result).toBeUndefined();
  });

  it('should eventually return different elements over many calls (non-deterministic)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<number>();
    for (let i = 0; i < 100; i++) {
      results.add(arrayRandomElement(arr));
    }
    // With 100 iterations and 10 elements, we should see more than 1 unique result
    expect(results.size).toBeGreaterThan(1);
  });
});
