import { asyncMapSequential } from './async.map.sequential';

describe('asyncMapSequential', () => {
  it('should map each element through the async mapper', async () => {
    const result = await asyncMapSequential([1, 2, 3], async n => n * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it('should return an empty array for empty input', async () => {
    const result = await asyncMapSequential([], async n => n);
    expect(result).toEqual([]);
  });

  it('should process items sequentially, not in parallel', async () => {
    const order: number[] = [];
    const mapper = async (n: number) => {
      order.push(n);
      await new Promise(resolve => setTimeout(resolve, 5));
      return n;
    };

    await asyncMapSequential([3, 1, 2], mapper);
    expect(order).toEqual([3, 1, 2]);
  });

  it('should handle a single-element array', async () => {
    const result = await asyncMapSequential(['hello'], async s =>
      s.toUpperCase()
    );
    expect(result).toEqual(['HELLO']);
  });

  it('should propagate errors from the mapper', async () => {
    const failingMapper = async (n: number) => {
      if (n === 2) throw new Error('mapper error');
      return n;
    };

    await expect(asyncMapSequential([1, 2, 3], failingMapper)).rejects.toThrow(
      'mapper error'
    );
  });

  it('should stop processing after first error', async () => {
    const processed: number[] = [];
    const failingMapper = async (n: number) => {
      processed.push(n);
      if (n === 2) throw new Error('stop');
      return n;
    };

    await expect(
      asyncMapSequential([1, 2, 3], failingMapper)
    ).rejects.toThrow();
    // Item 3 should never be processed
    expect(processed).toEqual([1, 2]);
  });

  it('should transform types correctly', async () => {
    const result = await asyncMapSequential([1, 2, 3], async n => `item-${n}`);
    expect(result).toEqual(['item-1', 'item-2', 'item-3']);
  });
});
