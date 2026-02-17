import { Space } from '@domain/space/space/space.entity';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { type Mocked, vi } from 'vitest';
import { EntityManager, In } from 'typeorm';
import { SpaceProviderLoaderCreator } from './space.provider.loader.creator';

/** Builds a space stub with about and levelZeroSpaceID. */
function makeSpace(
  spaceId: string,
  aboutId: string,
  levelZeroSpaceID: string
): Space {
  return {
    id: spaceId,
    about: { id: aboutId },
    levelZeroSpaceID,
  } as unknown as Space;
}

/** Builds an L0 space stub with account relation. */
function makeL0Space(spaceId: string, accountId: string): Space {
  return {
    id: spaceId,
    account: { id: accountId },
  } as unknown as Space;
}

describe('SpaceProviderLoaderCreator', () => {
  let creator: SpaceProviderLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceProviderLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(SpaceProviderLoaderCreator);
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
    it('should resolve provider (user) via full chain: aboutId → space → l0Space → account → user', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0Space = makeL0Space('l0-1', 'acc-1');
      const user = {
        id: 'user-1',
        accountID: 'acc-1',
        nameID: 'provider-user',
      } as unknown as User;

      // Call 1: load spaces by about.id
      entityManager.find.mockResolvedValueOnce([space]);
      // Call 2: load L0 spaces with account
      entityManager.find.mockResolvedValueOnce([l0Space]);
      // Call 3+4: load users and orgs in parallel (Promise.all)
      entityManager.find.mockResolvedValueOnce([user]); // users
      entityManager.find.mockResolvedValueOnce([]); // orgs

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
    });

    it('should resolve provider (organization) when no user found', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0Space = makeL0Space('l0-1', 'acc-1');
      const org = {
        id: 'org-1',
        accountID: 'acc-1',
        nameID: 'provider-org',
      } as unknown as Organization;

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0Space]);
      entityManager.find.mockResolvedValueOnce([]); // users
      entityManager.find.mockResolvedValueOnce([org]); // orgs

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('org-1');
    });

    it('should give user precedence over organization when both exist for same account', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0Space = makeL0Space('l0-1', 'acc-1');
      const user = { id: 'user-1', accountID: 'acc-1' } as unknown as User;
      const org = { id: 'org-1', accountID: 'acc-1' } as unknown as Organization;

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0Space]);
      entityManager.find.mockResolvedValueOnce([user]);
      entityManager.find.mockResolvedValueOnce([org]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      // User should take precedence (set after org in the map)
      expect(result!.id).toBe('user-1');
    });

    it('should batch multiple spaces and deduplicate L0 lookups', async () => {
      // Two subspaces under the same L0
      const space1 = makeSpace('s-1', 'about-1', 'l0-shared');
      const space2 = makeSpace('s-2', 'about-2', 'l0-shared');
      const l0Space = makeL0Space('l0-shared', 'acc-1');
      const user = { id: 'user-1', accountID: 'acc-1' } as unknown as User;

      entityManager.find.mockResolvedValueOnce([space1, space2]);
      entityManager.find.mockResolvedValueOnce([l0Space]);
      entityManager.find.mockResolvedValueOnce([user]);
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Both subspaces should resolve to the same provider
      expect(r1!.id).toBe('user-1');
      expect(r2!.id).toBe('user-1');

      // L0 space query should only list the deduplicated ID
      const l0FindCall = entityManager.find.mock.calls[1];
      expect(l0FindCall[0]).toBe(Space);
    });

    it('should return results in input order', async () => {
      const space1 = makeSpace('s-1', 'about-1', 'l0-1');
      const space2 = makeSpace('s-2', 'about-2', 'l0-2');
      const l0Space1 = makeL0Space('l0-1', 'acc-1');
      const l0Space2 = makeL0Space('l0-2', 'acc-2');
      const user1 = { id: 'u-1', accountID: 'acc-1' } as unknown as User;
      const user2 = { id: 'u-2', accountID: 'acc-2' } as unknown as User;

      // Return spaces in reverse order
      entityManager.find.mockResolvedValueOnce([space2, space1]);
      entityManager.find.mockResolvedValueOnce([l0Space2, l0Space1]);
      entityManager.find.mockResolvedValueOnce([user2, user1]);
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Results should match input order
      expect(r1!.id).toBe('u-1');
      expect(r2!.id).toBe('u-2');
    });
  });

  describe('edge cases', () => {
    it('should return null for spaceAbout IDs not found', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();
      const result = await loader.load('about-nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when L0 space has no account', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0SpaceNoAccount = {
        id: 'l0-1',
        account: undefined,
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0SpaceNoAccount]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should return null when no user or org matches the account', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0Space = makeL0Space('l0-1', 'acc-1');

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0Space]);
      entityManager.find.mockResolvedValueOnce([]); // no users
      entityManager.find.mockResolvedValueOnce([]); // no orgs

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should skip user/org lookup when no accounts are found', async () => {
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0SpaceNoAccount = {
        id: 'l0-1',
        account: undefined,
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0SpaceNoAccount]);

      const loader = creator.create();
      await loader.load('about-1');

      // Only 2 find calls: spaces and L0 spaces.
      // User/Org queries should be skipped (accountIdArray is empty).
      expect(entityManager.find).toHaveBeenCalledTimes(2);
    });

    it('should skip L0 lookup when no spaces found for about IDs', async () => {
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();
      await loader.load('about-nonexistent');

      // Only 1 find call: initial space lookup returns empty → no L0 lookup
      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });

    it('should propagate database errors to all pending loads', async () => {
      entityManager.find.mockRejectedValueOnce(
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
      const space = makeSpace('s-1', 'about-1', 'l0-1');
      const l0Space = makeL0Space('l0-1', 'acc-1');
      const user = { id: 'u-1', accountID: 'acc-1' } as unknown as User;

      entityManager.find.mockResolvedValueOnce([space]);
      entityManager.find.mockResolvedValueOnce([l0Space]);
      entityManager.find.mockResolvedValueOnce([user]);
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(entityManager.find).toHaveBeenCalledTimes(4); // only from first load
      expect(result1).toBe(result2);
    });

    it('should handle space with undefined about property', async () => {
      const orphan = {
        id: 'orphan',
        about: undefined,
        levelZeroSpaceID: 'l0-1',
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([orphan]);
      entityManager.find.mockResolvedValueOnce([]);

      const loader = creator.create();
      const result = await loader.load('about-orphan');

      expect(result).toBeNull();
    });
  });
});
