import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CalloutActivityLoaderCreator } from './callout.activity.loader.creator';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('CalloutActivityLoaderCreator', () => {
  let creator: CalloutActivityLoaderCreator;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutActivityLoaderCreator,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(CalloutActivityLoaderCreator);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(creator).toBeDefined();
  });

  it('should create a DataLoader', () => {
    const loader = creator.create();
    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  describe('batch loading', () => {
    it('should batch multiple loads into a single grouped COUNT query', async () => {
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'callout-1', count: 5 },
        { calloutId: 'callout-2', count: 12 },
      ]);

      const loader = creator.create();

      const [count1, count2] = await Promise.all([
        loader.load('callout-1'),
        loader.load('callout-2'),
      ]);

      expect(count1).toBe(5);
      expect(count2).toBe(12);
    });

    it('should return 0 for callouts with no contributions', async () => {
      // DB only returns a row for callout-1; callout-2 has no contributions
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'callout-1', count: 3 },
      ]);

      const loader = creator.create();

      const [count1, count2] = await Promise.all([
        loader.load('callout-1'),
        loader.load('callout-2'),
      ]);

      expect(count1).toBe(3);
      expect(count2).toBe(0);
    });

    it('should return results in input order regardless of DB return order', async () => {
      // DB returns in reverse order
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'callout-3', count: 30 },
        { calloutId: 'callout-2', count: 20 },
        { calloutId: 'callout-1', count: 10 },
      ]);

      const loader = creator.create();

      const [c1, c2, c3] = await Promise.all([
        loader.load('callout-1'),
        loader.load('callout-2'),
        loader.load('callout-3'),
      ]);

      expect(c1).toBe(10);
      expect(c2).toBe(20);
      expect(c3).toBe(30);
    });

    it('should parse count strings from DB as integers', async () => {
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'callout-1', count: 999 },
      ]);

      const loader = creator.create();
      const count = await loader.load('callout-1');

      expect(count).toBe(999);
      expect(typeof count).toBe('number');
    });
  });

  describe('caching', () => {
    it('should use DataLoader caching for repeated keys', async () => {
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'callout-1', count: 7 },
      ]);

      const loader = creator.create();

      const result1 = await loader.load('callout-1');
      const result2 = await loader.load('callout-1');

      expect(result1).toBe(result2);
    });

    it('should cache zero counts and not re-query', async () => {
      db.groupBy.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('callout-missing');
      expect(result1).toBe(0);

      const result2 = await loader.load('callout-missing');
      expect(result2).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors to all pending loads', async () => {
      db.groupBy.mockRejectedValueOnce(new Error('DB connection failed'));

      const loader = creator.create();

      const [result1, result2] = await Promise.allSettled([
        loader.load('callout-1'),
        loader.load('callout-2'),
      ]);

      expect(result1.status).toBe('rejected');
      expect(result2.status).toBe('rejected');
      expect((result1 as PromiseRejectedResult).reason.message).toBe(
        'DB connection failed'
      );
    });

    it('should handle a single callout load', async () => {
      db.groupBy.mockResolvedValueOnce([
        { calloutId: 'solo', count: 42 },
      ]);

      const loader = creator.create();
      const count = await loader.load('solo');

      expect(count).toBe(42);
    });

    it('should handle all callouts having zero contributions', async () => {
      db.groupBy.mockResolvedValueOnce([]);

      const loader = creator.create();

      const [c1, c2, c3] = await Promise.all([
        loader.load('callout-1'),
        loader.load('callout-2'),
        loader.load('callout-3'),
      ]);

      expect(c1).toBe(0);
      expect(c2).toBe(0);
      expect(c3).toBe(0);
    });
  });
});
