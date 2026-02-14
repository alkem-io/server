import { generateRandomArraySelection } from './random.util';

describe('generateRandomArraySelection', () => {
  it('should return an array of the requested length', () => {
    const result = generateRandomArraySelection(3, 10);
    expect(result).toHaveLength(3);
  });

  it('should return unique indices (no duplicates)', () => {
    const result = generateRandomArraySelection(5, 10);
    const unique = new Set(result);
    expect(unique.size).toBe(5);
  });

  it('should return indices within the valid range [0, size)', () => {
    const size = 10;
    const result = generateRandomArraySelection(5, size);
    for (const index of result) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(size);
    }
  });

  it('should return all indices when limit equals size', () => {
    const result = generateRandomArraySelection(5, 5);
    expect(result).toHaveLength(5);
    expect(result.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('should return an empty array when limit is 0', () => {
    const result = generateRandomArraySelection(0, 10);
    expect(result).toEqual([]);
  });

  it('should handle limit of 1', () => {
    const result = generateRandomArraySelection(1, 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeGreaterThanOrEqual(0);
    expect(result[0]).toBeLessThan(100);
  });

  it('should produce varying selections across calls', () => {
    const results: number[][] = [];
    for (let i = 0; i < 20; i++) {
      results.push(generateRandomArraySelection(3, 100));
    }
    // Not all results should be the same
    const serialized = results.map(r => JSON.stringify(r.sort()));
    const uniqueResults = new Set(serialized);
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});
