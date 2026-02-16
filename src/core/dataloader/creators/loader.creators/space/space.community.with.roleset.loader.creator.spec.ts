import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { SpaceCommunityWithRoleSetLoaderCreator } from './space.community.with.roleset.loader.creator';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

function makeSpaceRow(
  spaceId: string,
  aboutId: string,
  communityId: string
) {
  return {
    id: spaceId,
    about: { id: aboutId },
    community: {
      id: communityId,
      roleSet: { id: `roleset-${communityId}`, roles: [] },
    },
  };
}

describe('SpaceCommunityWithRoleSetLoaderCreator', () => {
  let creator: SpaceCommunityWithRoleSetLoaderCreator;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceCommunityWithRoleSetLoaderCreator,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(SpaceCommunityWithRoleSetLoaderCreator);
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
    it('should batch multiple loads into a single query', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'comm-1'),
        makeSpaceRow('s-2', 'about-2', 'comm-2'),
      ]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(result1).not.toBeNull();
      expect(result1!.id).toBe('comm-1');
      expect(result2).not.toBeNull();
      expect(result2!.id).toBe('comm-2');
    });

    it('should return null for SpaceAbout IDs not found', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'comm-1'),
      ]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-nonexistent'),
      ]);

      expect(result1!.id).toBe('comm-1');
      expect(result2).toBeNull();
    });

    it('should return results in input order regardless of DB return order', async () => {
      // DB returns in reverse order
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-3', 'about-3', 'comm-3'),
        makeSpaceRow('s-1', 'about-1', 'comm-1'),
        makeSpaceRow('s-2', 'about-2', 'comm-2'),
      ]);

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
      db.query.spaces.findMany.mockResolvedValueOnce([
        { id: 'orphan', about: undefined, community: undefined },
        makeSpaceRow('s-1', 'about-1', 'comm-1'),
      ]);

      const loader = creator.create();

      const [result1, result2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-orphan'),
      ]);

      expect(result1!.id).toBe('comm-1');
      expect(result2).toBeNull();
    });

    it('should skip spaces where community is undefined', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        { id: 's-1', about: { id: 'about-1' }, community: undefined },
      ]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should propagate database errors to all pending loads', async () => {
      db.query.spaces.findMany.mockRejectedValueOnce(
        new Error('DB connection failed')
      );

      const loader = creator.create();

      const [r1, r2] = await Promise.allSettled([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
    });

    it('should use DataLoader caching for repeated keys', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'comm-1'),
      ]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(result1).toBe(result2);
    });

    it('should cache null results and not re-query for same key', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('about-missing');
      expect(result1).toBeNull();

      const result2 = await loader.load('about-missing');
      expect(result2).toBeNull();
    });
  });
});
