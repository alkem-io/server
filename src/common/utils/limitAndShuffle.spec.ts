import { limitAndShuffle } from './limitAndShuffle';

describe('limitAndShuffle', () => {
  describe('when called without limit', () => {
    it('should return the full array', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(limitAndShuffle(arr)).toEqual(arr);
    });

    it('should return the full array even when shuffle is true', () => {
      const arr = [1, 2, 3];
      expect(limitAndShuffle(arr, undefined, true)).toEqual(arr);
    });
  });

  describe('when called with limit but no shuffle', () => {
    it('should return the first N elements', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(limitAndShuffle(arr, 3)).toEqual([1, 2, 3]);
    });

    it('should return the full array when limit exceeds array length', () => {
      const arr = [1, 2];
      expect(limitAndShuffle(arr, 10)).toEqual([1, 2]);
    });

    it('should return one element when limit is 1', () => {
      const arr = [10, 20, 30];
      expect(limitAndShuffle(arr, 1)).toEqual([10]);
    });
  });

  describe('when called with limit and shuffle', () => {
    it('should return the correct number of elements', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = limitAndShuffle(arr, 3, true);
      expect(result).toHaveLength(3);
    });

    it('should return elements from the original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = limitAndShuffle(arr, 3, true);
      for (const item of result) {
        expect(arr).toContain(item);
      }
    });

    it('should return unique elements (no duplicates)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = limitAndShuffle(arr, 5, true);
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });

    it('should handle limit equal to array length', () => {
      const arr = [1, 2, 3];
      const result = limitAndShuffle(arr, 3, true);
      expect(result).toHaveLength(3);
      expect(result.sort()).toEqual([1, 2, 3]);
    });

    it('should handle limit greater than array length', () => {
      const arr = [1, 2];
      const result = limitAndShuffle(arr, 5, true);
      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should return an empty array for null/undefined input', () => {
      expect(limitAndShuffle(null as unknown as any[])).toEqual([]);
      expect(limitAndShuffle(undefined as unknown as any[])).toEqual([]);
    });

    it('should return an empty array for empty input', () => {
      expect(limitAndShuffle([])).toEqual([]);
    });

    it('should return the full array when limit is 0 (falsy)', () => {
      // 0 is falsy, so !limit is true and the function returns the full array
      expect(limitAndShuffle([1, 2], 0)).toEqual([1, 2]);
    });

    it('should throw RangeError when limit is negative', () => {
      expect(() => limitAndShuffle([1, 2], -1)).toThrow(RangeError);
    });

    it('should not mutate the original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const copy = [...arr];
      limitAndShuffle(arr, 3, true);
      expect(arr).toEqual(copy);
    });
  });
});
