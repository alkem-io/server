import { asyncForEachBounded } from './async.for.each.bounded';

describe('asyncForEachBounded', () => {
  it('visits every item exactly once, in order of pickup', async () => {
    const seen: number[] = [];
    await asyncForEachBounded([1, 2, 3, 4, 5], 2, async item => {
      seen.push(item);
    });
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const release: Array<() => void> = [];

    const run = asyncForEachBounded(Array.from({ length: 12 }), 5, () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise<void>(resolve => {
        release.push(() => {
          inFlight--;
          resolve();
        });
      });
    });

    // Let the first wave start.
    await Promise.resolve();
    expect(inFlight).toBe(5);
    while (release.length > 0 || inFlight > 0) {
      const next = release.shift();
      if (next) next();
      await Promise.resolve();
      await Promise.resolve();
    }
    await run;
    expect(maxInFlight).toBe(5);
  });

  it('handles an empty list and a limit larger than the list', async () => {
    const worker = vi.fn().mockResolvedValue(undefined);
    await asyncForEachBounded([], 5, worker);
    expect(worker).not.toHaveBeenCalled();
    await asyncForEachBounded(['a'], 50, worker);
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it('rejects when a worker rejects', async () => {
    await expect(
      asyncForEachBounded([1, 2], 2, async item => {
        if (item === 2) throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });
});
