import { RoleName } from '@common/enums/role.name';
import { Credential } from '@domain/agent/credential/credential.entity';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { type Mocked, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { SpaceMetricsLoaderCreator } from './space.metrics.loader.creator';

/**
 * Helper to build a Space with the nested community → roleSet → roles chain
 * that the loader traverses.
 */
function makeSpaceWithMemberRole(
  spaceId: string,
  aboutId: string,
  resourceID: string
): Space {
  return {
    id: spaceId,
    about: { id: aboutId },
    community: {
      roleSet: {
        roles: [
          {
            name: RoleName.MEMBER,
            credential: { resourceID },
          },
          {
            name: RoleName.LEAD,
            credential: { resourceID: `lead-${resourceID}` },
          },
        ],
      },
    },
  } as unknown as Space;
}

/**
 * Sets up the mock for the Credential query builder chain.
 */
function mockCredentialQueryBuilder(
  entityManager: Mocked<EntityManager>,
  rawResult: { resourceID: string; count: string }[]
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

describe('SpaceMetricsLoaderCreator', () => {
  let creator: SpaceMetricsLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
      getRepository: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceMetricsLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(SpaceMetricsLoaderCreator);
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
    it('should resolve member metrics for multiple spaces', async () => {
      const space1 = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      const space2 = makeSpaceWithMemberRole('s-2', 'about-2', 'res-2');

      entityManager.find.mockResolvedValueOnce([space1, space2]);
      mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'res-1', count: '25' },
        { resourceID: 'res-2', count: '50' },
      ]);

      const loader = creator.create();

      const [metrics1, metrics2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Each result should be an array with one NVP: { name: 'members', value: '<count>' }
      expect(metrics1).toHaveLength(1);
      expect(metrics1[0].name).toBe('members');
      expect(metrics1[0].value).toBe('25');

      expect(metrics2).toHaveLength(1);
      expect(metrics2[0].name).toBe('members');
      expect(metrics2[0].value).toBe('50');
    });

    it('should batch the Space find into a single call', async () => {
      const space = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      entityManager.find.mockResolvedValueOnce([space]);
      mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'res-1', count: '10' },
      ]);

      const loader = creator.create();
      await loader.load('about-1');

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(Space, {
        where: { about: { id: expect.anything() } },
        relations: {
          about: true,
          community: { roleSet: { roles: true } },
        },
      });
    });

    it('should return 0 members when credential count query returns no rows', async () => {
      const space = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      entityManager.find.mockResolvedValueOnce([space]);
      mockCredentialQueryBuilder(entityManager, []);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('members');
      expect(metrics[0].value).toBe('0');
    });

    it('should return empty array for spaceAbout IDs not found', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();
      const metrics = await loader.load('about-nonexistent');

      expect(metrics).toEqual([]);
    });

    it('should return results in input order regardless of DB return order', async () => {
      const space1 = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      const space2 = makeSpaceWithMemberRole('s-2', 'about-2', 'res-2');

      // DB returns in reverse order
      entityManager.find.mockResolvedValueOnce([space2, space1]);
      mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'res-2', count: '200' },
        { resourceID: 'res-1', count: '100' },
      ]);

      const loader = creator.create();

      const [m1, m2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(m1[0].value).toBe('100');
      expect(m2[0].value).toBe('200');
    });

    it('should assign deterministic IDs to NVP objects', async () => {
      const space = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      entityManager.find.mockResolvedValueOnce([space]);
      mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'res-1', count: '5' },
      ]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics[0].id).toBe('members-about-1');
    });
  });

  describe('edge cases', () => {
    it('should skip spaces without community or roleSet', async () => {
      const noCommunity = {
        id: 's-1',
        about: { id: 'about-1' },
        community: undefined,
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([noCommunity]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      // No credential query should be made since no member roles found
      expect(entityManager.getRepository).not.toHaveBeenCalled();
      expect(metrics).toEqual([]);
    });

    it('should skip spaces where member role has no credential', async () => {
      const noCredential = {
        id: 's-1',
        about: { id: 'about-1' },
        community: {
          roleSet: {
            roles: [
              { name: RoleName.MEMBER, credential: undefined },
            ],
          },
        },
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([noCredential]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(entityManager.getRepository).not.toHaveBeenCalled();
      expect(metrics).toEqual([]);
    });

    it('should skip spaces with no MEMBER role at all', async () => {
      const noMemberRole = {
        id: 's-1',
        about: { id: 'about-1' },
        community: {
          roleSet: {
            roles: [
              {
                name: RoleName.LEAD,
                credential: { resourceID: 'lead-res' },
              },
            ],
          },
        },
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([noMemberRole]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(entityManager.getRepository).not.toHaveBeenCalled();
      expect(metrics).toEqual([]);
    });

    it('should deduplicate resourceIDs when subspaces share credentials', async () => {
      // Two spaces sharing the same resourceID (e.g. subspaces under same L0)
      const space1 = makeSpaceWithMemberRole('s-1', 'about-1', 'shared-res');
      const space2 = makeSpaceWithMemberRole('s-2', 'about-2', 'shared-res');

      entityManager.find.mockResolvedValueOnce([space1, space2]);

      const qb = mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'shared-res', count: '77' },
      ]);

      const loader = creator.create();

      const [m1, m2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Both should get the same count
      expect(m1[0].value).toBe('77');
      expect(m2[0].value).toBe('77');

      // The WHERE clause should use deduplicated resourceIDs
      const whereCall = qb.where.mock.calls[0];
      expect(whereCall[1].resourceIDs).toEqual(['shared-res']);
    });

    it('should propagate database errors to all pending loads', async () => {
      entityManager.find.mockRejectedValueOnce(new Error('connection lost'));

      const loader = creator.create();

      const [r1, r2] = await Promise.allSettled([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
    });

    it('should use DataLoader caching for repeated keys', async () => {
      const space = makeSpaceWithMemberRole('s-1', 'about-1', 'res-1');
      entityManager.find.mockResolvedValueOnce([space]);
      mockCredentialQueryBuilder(entityManager, [
        { resourceID: 'res-1', count: '10' },
      ]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });
  });
});
