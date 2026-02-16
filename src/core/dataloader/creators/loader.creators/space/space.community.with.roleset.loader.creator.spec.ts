import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { SpaceCommunityWithRoleSetLoaderCreator } from './space.community.with.roleset.loader.creator';

function makeSpaceWithCommunity(
  spaceId: string,
  aboutId: string,
  communityId: string
): Space {
  return {
    id: spaceId,
    about: { id: aboutId },
    community: {
      id: communityId,
      roleSet: { id: `roleset-${communityId}`, roles: [] },
    },
  } as unknown as Space;
}

describe('SpaceCommunityWithRoleSetLoaderCreator', () => {
  let creator: SpaceCommunityWithRoleSetLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceCommunityWithRoleSetLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(SpaceCommunityWithRoleSetLoaderCreator);
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
      const space1 = makeSpaceWithCommunity('s-1', 'about-1', 'comm-1');
      const space2 = makeSpaceWithCommunity('s-2', 'about-2', 'comm-2');

      entityManager.find.mockResolvedValueOnce([space1, space2]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(Space, {
        where: { about: { id: expect.anything() } },
        relations: {
          about: true,
          community: { roleSet: { roles: true } },
        },
      });

      expect(result1).not.toBeNull();
      expect(result1!.id).toBe('comm-1');
      expect(result2).not.toBeNull();
      expect(result2!.id).toBe('comm-2');
    });

    it('should return null for SpaceAbout IDs not found', async () => {
      const space1 = makeSpaceWithCommunity('s-1', 'about-1', 'comm-1');
      entityManager.find.mockResolvedValueOnce([space1]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-nonexistent'),
      ]);

      expect(result1!.id).toBe('comm-1');
      expect(result2).toBeNull();
    });

    it('should return results in input order regardless of DB return order', async () => {
      const space1 = makeSpaceWithCommunity('s-1', 'about-1', 'comm-1');
      const space2 = makeSpaceWithCommunity('s-2', 'about-2', 'comm-2');
      const space3 = makeSpaceWithCommunity('s-3', 'about-3', 'comm-3');

      // DB returns in reverse order
      entityManager.find.mockResolvedValueOnce([space3, space1, space2]);

      const loader = creator.create();

      const [r1, r2, r3] = await Promise.all([
        loader.load('about-2'),
        loader.load('about-1'),
        loader.load('about-3'),
      ]);

      expect(r1!.id).toBe('comm-2');
      expect(r2!.id).toBe('comm-1');
      expect(r3!.id).toBe('comm-3');
    });
  });

  describe('edge cases', () => {
    it('should skip spaces where about is undefined', async () => {
      const orphan = { id: 'orphan', about: undefined } as unknown as Space;
      const valid = makeSpaceWithCommunity('s-1', 'about-1', 'comm-1');

      entityManager.find.mockResolvedValueOnce([orphan, valid]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-orphan'),
      ]);

      expect(result1!.id).toBe('comm-1');
      expect(result2).toBeNull();
    });

    it('should skip spaces where community is undefined', async () => {
      const noCommunity = {
        id: 's-1',
        about: { id: 'about-1' },
        community: undefined,
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([noCommunity]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should propagate database errors to all pending loads', async () => {
      entityManager.find.mockRejectedValueOnce(new Error('DB timeout'));

      const loader = creator.create();

      const [r1, r2] = await Promise.allSettled([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
    });

    it('should use DataLoader caching for repeated keys', async () => {
      const space = makeSpaceWithCommunity('s-1', 'about-1', 'comm-1');
      entityManager.find.mockResolvedValueOnce([space]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should cache null results and not re-query for same key', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('about-missing');
      expect(result1).toBeNull();

      const result2 = await loader.load('about-missing');
      expect(result2).toBeNull();

      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });
  });
});
