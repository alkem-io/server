import { asyncFilter } from './async.filter';

describe('asyncFilter', () => {
  it('should filter elements based on an async predicate', async () => {
    const arr = [1, 2, 3, 4, 5];
    const isEven = async (n: number) => n % 2 === 0;

    const result = await asyncFilter(arr, isEven);
    expect(result).toEqual([2, 4]);
  });

  it('should return an empty array when no elements match', async () => {
    const arr = [1, 3, 5];
    const isEven = async (n: number) => n % 2 === 0;

    const result = await asyncFilter(arr, isEven);
    expect(result).toEqual([]);
  });

  it('should return all elements when every element matches', async () => {
    const arr = [2, 4, 6];
    const isEven = async (n: number) => n % 2 === 0;

    const result = await asyncFilter(arr, isEven);
    expect(result).toEqual([2, 4, 6]);
  });

  it('should return an empty array for an empty input', async () => {
    const result = await asyncFilter([], async () => true);
    expect(result).toEqual([]);
  });

  it('should preserve element order', async () => {
    const arr = [5, 3, 1, 4, 2];
    const isOdd = async (n: number) => n % 2 !== 0;

    const result = await asyncFilter(arr, isOdd);
    expect(result).toEqual([5, 3, 1]);
  });

  it('should work with string arrays', async () => {
    const arr = ['apple', 'banana', 'avocado', 'cherry'];
    const startsWithA = async (s: string) => s.startsWith('a');

    const result = await asyncFilter(arr, startsWithA);
    expect(result).toEqual(['apple', 'avocado']);
  });

  it('should handle predicates with async delays', async () => {
    const arr = [10, 20, 30];
    const delayedPredicate = async (n: number) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return n > 15;
    };

    const result = await asyncFilter(arr, delayedPredicate);
    expect(result).toEqual([20, 30]);
  });

  it('should not mutate the original array', async () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    await asyncFilter(arr, async n => n > 3);
    expect(arr).toEqual(copy);
  });
});
