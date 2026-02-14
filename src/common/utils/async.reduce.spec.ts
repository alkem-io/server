import { asyncReduce } from './async.reduce';

describe('asyncReduce', () => {
  it('should reduce an array to a sum', async () => {
    const result = await asyncReduce(
      [1, 2, 3, 4],
      async (acc, cur) => acc + cur,
      0
    );
    expect(result).toBe(10);
  });

  it('should return initial value for an empty array', async () => {
    const result = await asyncReduce(
      [],
      async (acc, _cur) => acc,
      'initial'
    );
    expect(result).toBe('initial');
  });

  it('should provide correct index to the reducer', async () => {
    const indices: number[] = [];
    await asyncReduce(
      ['x', 'y', 'z'],
      async (acc, _cur, index) => {
        indices.push(index);
        return acc;
      },
      0
    );
    expect(indices).toEqual([0, 1, 2]);
  });

  it('should accumulate an array of transformed items', async () => {
    const result = await asyncReduce(
      [1, 2, 3],
      async (acc, cur) => {
        acc.push(cur * cur);
        return acc;
      },
      [] as number[]
    );
    expect(result).toEqual([1, 4, 9]);
  });

  it('should propagate errors from the reducer', async () => {
    await expect(
      asyncReduce(
        [1, 2, 3],
        async (_acc, cur) => {
          if (cur === 2) throw new Error('reduce error');
          return 0;
        },
        0
      )
    ).rejects.toThrow('reduce error');
  });

  it('should handle a single-element array', async () => {
    const result = await asyncReduce(
      [7],
      async (acc, cur) => acc * cur,
      3
    );
    expect(result).toBe(21);
  });

  it('should count elements matching a condition', async () => {
    const result = await asyncReduce(
      [1, 2, 3, 4, 5],
      async (acc, cur) => (cur > 3 ? acc + 1 : acc),
      0
    );
    expect(result).toBe(2);
  });
});
