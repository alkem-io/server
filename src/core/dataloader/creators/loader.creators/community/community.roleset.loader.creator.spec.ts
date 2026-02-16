import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { Community } from '@domain/community/community/community.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CommunityRoleSetLoaderCreator } from './community.roleset.loader.creator';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

function makeCommunityRow(communityId: string, roleSetId: string) {
  return {
    id: communityId,
    roleSet: {
      id: roleSetId,
      roles: [{ id: 'role-1', name: 'member' }],
    },
  };
}

describe('CommunityRoleSetLoaderCreator', () => {
  let creator: CommunityRoleSetLoaderCreator;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityRoleSetLoaderCreator,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(CommunityRoleSetLoaderCreator);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(creator).toBeDefined();
  });

  it('should create a DataLoader', () => {
    const loader = creator.create({ parentClassRef: Community } as any);
    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  describe('batch loading', () => {
    it('should batch multiple loads into a single query', async () => {
      db.query.communities.findMany.mockResolvedValueOnce([
        makeCommunityRow('comm-1', 'rs-1'),
        makeCommunityRow('comm-2', 'rs-2'),
      ]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const [result1, result2] = await Promise.all([
        loader.load('comm-1'),
        loader.load('comm-2'),
      ]);

      expect((result1 as IRoleSet).id).toBe('rs-1');
      expect((result2 as IRoleSet).id).toBe('rs-2');
    });

    it('should return results in input key order', async () => {
      // DB returns in different order
      db.query.communities.findMany.mockResolvedValueOnce([
        makeCommunityRow('comm-3', 'rs-3'),
        makeCommunityRow('comm-1', 'rs-1'),
        makeCommunityRow('comm-2', 'rs-2'),
      ]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const [result1, result2, result3] = await Promise.all([
        loader.load('comm-2'),
        loader.load('comm-1'),
        loader.load('comm-3'),
      ]);

      expect((result1 as IRoleSet).id).toBe('rs-2');
      expect((result2 as IRoleSet).id).toBe('rs-1');
      expect((result3 as IRoleSet).id).toBe('rs-3');
    });

    it('should use DataLoader caching for repeated keys', async () => {
      db.query.communities.findMany.mockResolvedValueOnce([
        makeCommunityRow('comm-1', 'rs-1'),
      ]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const result1 = await loader.load('comm-1');
      const result2 = await loader.load('comm-1');

      expect(result1).toBe(result2);
    });

    it('should pre-load roles on the returned roleSet', async () => {
      db.query.communities.findMany.mockResolvedValueOnce([
        makeCommunityRow('comm-1', 'rs-1'),
      ]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const result = (await loader.load('comm-1')) as IRoleSet;

      expect(result.roles).toBeDefined();
      expect(result.roles).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors to all pending loads', async () => {
      db.query.communities.findMany.mockRejectedValueOnce(
        new Error('DB connection failed')
      );

      const loader = creator.create({ parentClassRef: Community } as any);

      const [result1, result2] = await Promise.allSettled([
        loader.load('comm-1'),
        loader.load('comm-2'),
      ]);

      expect(result1.status).toBe('rejected');
      expect(result2.status).toBe('rejected');
      expect((result1 as PromiseRejectedResult).reason.message).toBe(
        'DB connection failed'
      );
    });
  });
});
