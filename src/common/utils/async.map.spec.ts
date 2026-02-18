import { asyncMap } from './async.map';

describe('asyncMap', () => {
  it('should map each element through the async mapper', async () => {
    const result = await asyncMap([1, 2, 3], async n => n * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it('should return an empty array for empty input', async () => {
    const result = await asyncMap([], async n => n);
    expect(result).toEqual([]);
  });

  it('should process items concurrently', async () => {
    const startTime = Date.now();
    const delay = 50;

    await asyncMap([1, 2, 3], async n => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return n;
    });

    const elapsed = Date.now() - startTime;
    // If concurrent, total time should be roughly one delay period, not three
    expect(elapsed).toBeLessThan(delay * 2.5);
  });

  it('should preserve result order even with varying async durations', async () => {
    const result = await asyncMap([3, 1, 2], async n => {
      // Shorter delay for larger numbers so they finish first
      await new Promise(resolve => setTimeout(resolve, (4 - n) * 10));
      return n * 10;
    });
    expect(result).toEqual([30, 10, 20]);
  });

  it('should propagate errors from the mapper', async () => {
    const failingMapper = async (n: number) => {
      if (n === 2) throw new Error('mapper error');
      return n;
    };

    await expect(asyncMap([1, 2, 3], failingMapper)).rejects.toThrow(
      'mapper error'
    );
  });

  it('should handle a single-element array', async () => {
    const result = await asyncMap([42], async n => n.toString());
    expect(result).toEqual(['42']);
  });

  it('should transform types correctly', async () => {
    const result = await asyncMap(['a', 'b', 'c'], async s => s.charCodeAt(0));
    expect(result).toEqual([97, 98, 99]);
  });
});
