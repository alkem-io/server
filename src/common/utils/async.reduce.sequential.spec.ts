import { asyncReduceSequential } from './async.reduce.sequential';

describe('asyncReduceSequential', () => {
  it('should reduce an array to a sum', async () => {
    const result = await asyncReduceSequential(
      [1, 2, 3, 4],
      async (acc, cur) => acc + cur,
      0
    );
    expect(result).toBe(10);
  });

  it('should return initial value for an empty array', async () => {
    const result = await asyncReduceSequential(
      [],
      async (acc, _cur) => acc,
      42
    );
    expect(result).toBe(42);
  });

  it('should process items sequentially', async () => {
    const order: number[] = [];
    await asyncReduceSequential(
      [1, 2, 3],
      async (acc, cur) => {
        order.push(cur);
        await new Promise(resolve => setTimeout(resolve, 5));
        return acc + cur;
      },
      0
    );
    expect(order).toEqual([1, 2, 3]);
  });

  it('should provide correct index to the reducer', async () => {
    const indices: number[] = [];
    await asyncReduceSequential(
      ['a', 'b', 'c'],
      async (acc, _cur, index) => {
        indices.push(index);
        return acc;
      },
      ''
    );
    expect(indices).toEqual([0, 1, 2]);
  });

  it('should accumulate strings by concatenation', async () => {
    const result = await asyncReduceSequential(
      ['hello', ' ', 'world'],
      async (acc, cur) => acc + cur,
      ''
    );
    expect(result).toBe('hello world');
  });

  it('should build an object from an array', async () => {
    const result = await asyncReduceSequential(
      [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ],
      async (acc, cur) => {
        acc[cur.key] = cur.value;
        return acc;
      },
      {} as Record<string, number>
    );
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should propagate errors from the reducer', async () => {
    await expect(
      asyncReduceSequential(
        [1, 2, 3],
        async (_acc, cur) => {
          if (cur === 2) throw new Error('reducer error');
          return 0;
        },
        0
      )
    ).rejects.toThrow('reducer error');
  });

  it('should handle a single-element array', async () => {
    const result = await asyncReduceSequential(
      [5],
      async (acc, cur) => acc + cur,
      10
    );
    expect(result).toBe(15);
  });
});
