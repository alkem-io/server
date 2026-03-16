import {
  DELETED_ACTOR_ID,
  MATRIX_BOT_ACTOR_ID,
} from '@common/constants/system.actor.ids';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { ContributorByAgentIdLoaderCreator } from './contributor.by.agent.id.loader.creator';

/**
 * Helper that sets up entity-aware find mocking.
 * Uses entity name comparison since class identity may differ with isolate: false.
 */
function setupFindMock(
  entityManager: Mocked<EntityManager>,
  results: { users?: any[]; orgs?: any[]; vcs?: any[] }
) {
  const allResults = [
    ...(results.users ?? []),
    ...(results.orgs ?? []),
    ...(results.vcs ?? []),
  ];
  // Return all results from every find call - the batch function merges by ID
  entityManager.find.mockResolvedValue(allResults);
}

describe('ContributorByAgentIdLoaderCreator', () => {
  let creator: ContributorByAgentIdLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorByAgentIdLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(ContributorByAgentIdLoaderCreator);
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
    it('should return null for all entries when all IDs are system actor IDs', async () => {
      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load(DELETED_ACTOR_ID),
        loader.load(MATRIX_BOT_ACTOR_ID),
      ]);

      // System IDs are filtered out -> validIds is empty -> early return
      expect(r1).toBeNull();
      expect(r2).toBeNull();
      // find should NOT be called since all IDs were filtered out
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should return null for invalid UUIDs', async () => {
      const loader = creator.create();

      const result = await loader.load('not-a-uuid');

      expect(result).toBeNull();
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should batch user, organization, and VC lookups in parallel', async () => {
      const mockUser = {
        id: 'a1111111-1111-4111-8111-111111111111',
        profile: {},
      };
      const mockOrg = {
        id: 'b2222222-2222-4222-8222-222222222222',
        profile: {},
      };
      const mockVC = {
        id: 'c3333333-3333-4333-8333-333333333333',
        profile: {},
      };

      setupFindMock(entityManager, {
        users: [mockUser],
        orgs: [mockOrg],
        vcs: [mockVC],
      });

      const loader = creator.create();

      const [u, o, v] = await Promise.all([
        loader.load('a1111111-1111-4111-8111-111111111111'),
        loader.load('b2222222-2222-4222-8222-222222222222'),
        loader.load('c3333333-3333-4333-8333-333333333333'),
      ]);

      expect(u).toEqual(mockUser);
      expect(o).toEqual(mockOrg);
      expect(v).toEqual(mockVC);

      expect(entityManager.find).toHaveBeenCalledTimes(3);
      expect(entityManager.find).toHaveBeenCalledWith(User, expect.any(Object));
      expect(entityManager.find).toHaveBeenCalledWith(
        Organization,
        expect.any(Object)
      );
      expect(entityManager.find).toHaveBeenCalledWith(
        VirtualContributor,
        expect.any(Object)
      );
    });

    it('should return null for IDs not found in any entity table', async () => {
      setupFindMock(entityManager, {});

      const loader = creator.create();

      const result = await loader.load('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');

      expect(result).toBeNull();
    });

    it('should return results in input order', async () => {
      const user1 = {
        id: 'a1111111-1111-4111-8111-111111111111',
        profile: {},
      };
      const user2 = {
        id: 'b2222222-2222-4222-8222-222222222222',
        profile: {},
      };

      setupFindMock(entityManager, { users: [user2, user1] });

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('a1111111-1111-4111-8111-111111111111'),
        loader.load('b2222222-2222-4222-8222-222222222222'),
      ]);

      expect(r1).toEqual(user1);
      expect(r2).toEqual(user2);
    });

    it('should mix system IDs with valid IDs correctly', async () => {
      const mockUser = {
        id: 'a1111111-1111-4111-8111-111111111111',
        profile: {},
      };

      setupFindMock(entityManager, { users: [mockUser] });

      const loader = creator.create();

      const [systemResult, validResult] = await Promise.all([
        loader.load(DELETED_ACTOR_ID),
        loader.load('a1111111-1111-4111-8111-111111111111'),
      ]);

      expect(systemResult).toBeNull();
      expect(validResult).toEqual(mockUser);
    });
  });

  describe('caching', () => {
    it('should use DataLoader internal cache for repeated keys within same loader', async () => {
      const mockUser = {
        id: 'a1111111-1111-4111-8111-111111111111',
        profile: {},
      };

      setupFindMock(entityManager, { users: [mockUser] });

      const loader = creator.create();

      // First load triggers the batch function
      const r1 = await loader.load('a1111111-1111-4111-8111-111111111111');
      expect(r1).toEqual(mockUser);

      // DataLoader caches, so find count should stay at 3 (User, Org, VC from first batch)
      const callCountAfterFirst = entityManager.find.mock.calls.length;
      expect(callCountAfterFirst).toBe(3);

      // Second load for same key should use cache
      const r2 = await loader.load('a1111111-1111-4111-8111-111111111111');
      expect(r2).toEqual(mockUser);
      expect(entityManager.find.mock.calls.length).toBe(callCountAfterFirst);
    });
  });
});
