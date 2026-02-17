import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { type Mocked, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { CalloutActivityLoaderCreator } from './callout.activity.loader.creator';

/**
 * Helper to build the mock query builder chain used by
 * `manager.getRepository(CalloutContribution).createQueryBuilder(...)`.
 * Returns the terminal mock so we can set what `getRawMany` resolves to.
 */
function mockQueryBuilder(
  entityManager: Mocked<EntityManager>,
  rawResult: { calloutId: string; count: string }[]
) {
  const qb = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawResult),
  };
  const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
  entityManager.getRepository.mockReturnValue(repo as any);
  return qb;
}

describe('CalloutActivityLoaderCreator', () => {
  let creator: CalloutActivityLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
      getRepository: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutActivityLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(CalloutActivityLoaderCreator);
    entityManager = module.get(
      getEntityManagerToken()
    ) as Mocked<EntityManager>;
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
      mockQueryBuilder(entityManager, [
        { calloutId: 'callout-1', count: '5' },
        { calloutId: 'callout-2', count: '12' },
      ]);

      const loader = creator.create();

      const [count1, count2] = await Promise.all([
        loader.load('callout-1'),
        loader.load('callout-2'),
      ]);

      expect(entityManager.getRepository).toHaveBeenCalledWith(
        CalloutContribution
      );
      expect(count1).toBe(5);
      expect(count2).toBe(12);
    });

    it('should return 0 for callouts with no contributions', async () => {
      // DB only returns a row for callout-1; callout-2 has no contributions
      mockQueryBuilder(entityManager, [
        { calloutId: 'callout-1', count: '3' },
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
      mockQueryBuilder(entityManager, [
        { calloutId: 'callout-3', count: '30' },
        { calloutId: 'callout-1', count: '10' },
        { calloutId: 'callout-2', count: '20' },
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
      mockQueryBuilder(entityManager, [
        { calloutId: 'callout-1', count: '999' },
      ]);

      const loader = creator.create();
      const count = await loader.load('callout-1');

      expect(count).toBe(999);
      expect(typeof count).toBe('number');
    });
  });

  describe('caching', () => {
    it('should use DataLoader caching for repeated keys', async () => {
      mockQueryBuilder(entityManager, [
        { calloutId: 'callout-1', count: '7' },
      ]);

      const loader = creator.create();

      const result1 = await loader.load('callout-1');
      const result2 = await loader.load('callout-1');

      expect(entityManager.getRepository).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should cache zero counts and not re-query', async () => {
      mockQueryBuilder(entityManager, []);

      const loader = creator.create();

      const result1 = await loader.load('callout-missing');
      expect(result1).toBe(0);

      const result2 = await loader.load('callout-missing');
      expect(result2).toBe(0);

      expect(entityManager.getRepository).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors to all pending loads', async () => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi
          .fn()
          .mockRejectedValue(new Error('DB connection failed')),
      };
      const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
      entityManager.getRepository.mockReturnValue(repo as any);

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
      mockQueryBuilder(entityManager, [
        { calloutId: 'solo', count: '42' },
      ]);

      const loader = creator.create();
      const count = await loader.load('solo');

      expect(count).toBe(42);
    });

    it('should handle all callouts having zero contributions', async () => {
      mockQueryBuilder(entityManager, []);

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
