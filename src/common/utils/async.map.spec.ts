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

  it('should dispatch mapper bodies concurrently rather than serially', async () => {
    // The previous form asserted `elapsed < delay * 2.5` wall-clock, which
    // flaked under CI contention. Replaced with a deterministic concurrency
    // probe: track how many mapper bodies have *entered* by the time the
    // first one *resolves*. asyncMap is `Promise.all(array.map(mapper))`, so
    // all bodies are entered synchronously before any resolves; serial
    // dispatch would observe `started === 1` at first resolution.
    const N = 3;
    let started = 0;
    let startedAtFirstResolve = 0;

    const result = await asyncMap([1, 2, 3], async n => {
      started++;
      await new Promise(resolve => setTimeout(resolve, 5));
      if (startedAtFirstResolve === 0) startedAtFirstResolve = started;
      return n;
    });

    expect(result).toEqual([1, 2, 3]);
    expect(startedAtFirstResolve).toBe(N);
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
