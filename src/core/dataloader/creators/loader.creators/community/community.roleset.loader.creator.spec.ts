import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { Community } from '@domain/community/community/community.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { CommunityRoleSetLoaderCreator } from './community.roleset.loader.creator';

function makeCommunity(communityId: string, roleSetId: string): Community {
  return {
    id: communityId,
    roleSet: {
      id: roleSetId,
      roles: [{ id: 'role-1', name: 'member' }],
    },
  } as unknown as Community;
}

describe('CommunityRoleSetLoaderCreator', () => {
  let creator: CommunityRoleSetLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityRoleSetLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(CommunityRoleSetLoaderCreator);
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
    const loader = creator.create({ parentClassRef: Community } as any);
    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  describe('batch loading', () => {
    it('should batch multiple loads into a single query', async () => {
      const community1 = makeCommunity('comm-1', 'rs-1');
      const community2 = makeCommunity('comm-2', 'rs-2');

      entityManager.find.mockResolvedValueOnce([community1, community2]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const [result1, result2] = await Promise.all([
        loader.load('comm-1'),
        loader.load('comm-2'),
      ]);

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(
        Community,
        expect.objectContaining({
          where: { id: expect.anything() },
          relations: { roleSet: { roles: true } },
        })
      );

      expect((result1 as IRoleSet).id).toBe('rs-1');
      expect((result2 as IRoleSet).id).toBe('rs-2');
    });

    it('should return results in input key order', async () => {
      const community1 = makeCommunity('comm-1', 'rs-1');
      const community2 = makeCommunity('comm-2', 'rs-2');
      const community3 = makeCommunity('comm-3', 'rs-3');

      // DB returns in different order
      entityManager.find.mockResolvedValueOnce([
        community3,
        community1,
        community2,
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
      const community1 = makeCommunity('comm-1', 'rs-1');

      entityManager.find.mockResolvedValueOnce([community1]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const result1 = await loader.load('comm-1');
      const result2 = await loader.load('comm-1');

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should pre-load roles on the returned roleSet', async () => {
      const community = makeCommunity('comm-1', 'rs-1');

      entityManager.find.mockResolvedValueOnce([community]);

      const loader = creator.create({ parentClassRef: Community } as any);

      const result = (await loader.load('comm-1')) as IRoleSet;

      expect(result.roles).toBeDefined();
      expect(result.roles).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors to all pending loads', async () => {
      entityManager.find.mockRejectedValueOnce(
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
