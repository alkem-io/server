import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { type Mocked, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { SpaceBySpaceAboutIdLoaderCreator } from './space.by.space.about.id.loader.creator';

function makeSpace(spaceId: string, aboutId: string): Space {
  return {
    id: spaceId,
    about: { id: aboutId },
    settings: {
      privacy: { mode: 'public' },
    },
  } as unknown as Space;
}

describe('SpaceBySpaceAboutIdLoaderCreator', () => {
  let creator: SpaceBySpaceAboutIdLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceBySpaceAboutIdLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(SpaceBySpaceAboutIdLoaderCreator);
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
    it('should batch multiple loads into a single query', async () => {
      const space1 = makeSpace('space-1', 'about-1');
      const space2 = makeSpace('space-2', 'about-2');

      entityManager.find.mockResolvedValueOnce([space1, space2]);

      const loader = creator.create();

      // Load multiple keys — DataLoader will batch them
      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(Space, {
        where: {
          about: { id: expect.anything() },
        },
        relations: { about: true },
      });

      expect((result1 as ISpace).id).toBe('space-1');
      expect((result2 as ISpace).id).toBe('space-2');
    });

    it('should return null for SpaceAbout IDs not found', async () => {
      const space1 = makeSpace('space-1', 'about-1');

      // Only return one space — about-2 has no match (e.g. TemplateContentSpace)
      entityManager.find.mockResolvedValueOnce([space1]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect((result1 as ISpace).id).toBe('space-1');
      expect(result2).toBeNull();
    });

    it('should use DataLoader caching for repeated keys', async () => {
      const space1 = makeSpace('space-1', 'about-1');

      entityManager.find.mockResolvedValueOnce([space1]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      // Second load should be served from cache, not trigger another query
      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should return empty results for empty input', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      // Load a key that won't be found
      const result = await loader.load('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors to all pending loads', async () => {
      entityManager.find.mockRejectedValueOnce(
        new Error('DB connection failed')
      );

      const loader = creator.create();

      const [result1, result2] = await Promise.allSettled([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(result1.status).toBe('rejected');
      expect(result2.status).toBe('rejected');
      expect((result1 as PromiseRejectedResult).reason.message).toBe(
        'DB connection failed'
      );
      expect((result2 as PromiseRejectedResult).reason.message).toBe(
        'DB connection failed'
      );
    });

    it('should return null when space has undefined about property', async () => {
      const spaceWithAbout = makeSpace('s-1', 'about-1');
      const orphanSpace = { id: 'orphan', about: undefined } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([spaceWithAbout, orphanSpace]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-orphan'),
      ]);

      expect((result1 as ISpace).id).toBe('s-1');
      expect(result2).toBeNull();
    });

    it('should return results in input key order regardless of database return order', async () => {
      const space1 = makeSpace('space-1', 'about-1');
      const space2 = makeSpace('space-2', 'about-2');
      const space3 = makeSpace('space-3', 'about-3');

      // DB returns in reverse order
      entityManager.find.mockResolvedValueOnce([space3, space1, space2]);

      const loader = creator.create();

      const [result1, result2, result3] = await Promise.all([
        loader.load('about-2'),
        loader.load('about-1'),
        loader.load('about-3'),
      ]);

      // Results should match input key order, not DB return order
      expect((result1 as ISpace).id).toBe('space-2');
      expect((result2 as ISpace).id).toBe('space-1');
      expect((result3 as ISpace).id).toBe('space-3');
    });

    it('should cache null results and not re-query for same key', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('about-missing');
      expect(result1).toBeNull();

      // Second load of the same key should be served from cache
      const result2 = await loader.load('about-missing');
      expect(result2).toBeNull();

      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });
  });
});
