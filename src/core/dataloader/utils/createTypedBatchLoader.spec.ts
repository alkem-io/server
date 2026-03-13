import { EntityNotFoundException } from '@common/exceptions';
import { createBatchLoader } from './createTypedBatchLoader';

describe('createBatchLoader', () => {
  it('should create a DataLoader instance', () => {
    const loader = createBatchLoader(async () => [], {
      name: 'test',
      loadedTypeName: 'TestEntity',
      resolveToNull: false,
    });

    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  it('should return results sorted by keys when all keys are found', async () => {
    const data = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ];
    const batchFn = vi.fn().mockResolvedValue(data);
    const loader = createBatchLoader(batchFn, {
      name: 'test',
      loadedTypeName: 'TestEntity',
      resolveToNull: false,
    });

    const results = await Promise.all([
      loader.load('a'),
      loader.load('b'),
      loader.load('c'),
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ id: 'a', value: 1 });
    expect(results[1]).toEqual({ id: 'b', value: 2 });
    expect(results[2]).toEqual({ id: 'c', value: 3 });
  });

  it('should reject with EntityNotFoundException for missing keys when resolveToNull is false', async () => {
    const data = [{ id: 'a', value: 1 }];
    const batchFn = vi.fn().mockResolvedValue(data);
    const loader = createBatchLoader(batchFn, {
      name: 'test',
      loadedTypeName: 'TestEntity',
      resolveToNull: false,
    });

    // DataLoader treats Error instances in the result array as rejections
    // Load both in the same tick so they're in the same batch
    const promiseA = loader.load('a');
    const promiseMissing = loader.load('missing');

    const resultA = await promiseA;
    expect(resultA).toEqual({ id: 'a', value: 1 });

    await expect(promiseMissing).rejects.toBeInstanceOf(
      EntityNotFoundException
    );
  });

  it('should return null for missing keys when resolveToNull is true', async () => {
    const data = [{ id: 'a', value: 1 }];
    const batchFn = vi.fn().mockResolvedValue(data);
    const loader = createBatchLoader(batchFn, {
      name: 'test',
      loadedTypeName: 'TestEntity',
      resolveToNull: true,
    });

    const results = await Promise.all([
      loader.load('a'),
      loader.load('missing'),
    ]);

    expect(results[0]).toEqual({ id: 'a', value: 1 });
    expect(results[1]).toBeNull();
  });

  it('should call batch function only once for duplicate keys due to caching', async () => {
    const batchFn = vi.fn().mockResolvedValue([{ id: 'a', value: 1 }]);
    const loader = createBatchLoader(batchFn, {
      name: 'test',
      loadedTypeName: 'TestEntity',
      resolveToNull: false,
    });

    const [result1, result2] = await Promise.all([
      loader.load('a'),
      loader.load('a'),
    ]);

    // Both resolve to the same value
    expect(result1).toEqual({ id: 'a', value: 1 });
    expect(result2).toEqual({ id: 'a', value: 1 });
    // Batch function called once with deduplicated keys
    expect(batchFn).toHaveBeenCalledTimes(1);
  });
});
