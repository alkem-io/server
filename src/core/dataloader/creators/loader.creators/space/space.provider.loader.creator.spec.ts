import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { SpaceProviderLoaderCreator } from './space.provider.loader.creator';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

/** Builds a space row with about and levelZeroSpaceID. */
function makeSpaceRow(
  spaceId: string,
  aboutId: string,
  levelZeroSpaceID: string
) {
  return {
    id: spaceId,
    about: { id: aboutId },
    levelZeroSpaceID,
  };
}

/** Builds an L0 space row with account relation. */
function makeL0SpaceRow(spaceId: string, accountId: string) {
  return {
    id: spaceId,
    account: { id: accountId },
  };
}

describe('SpaceProviderLoaderCreator', () => {
  let creator: SpaceProviderLoaderCreator;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceProviderLoaderCreator,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(SpaceProviderLoaderCreator);
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
    it('should resolve provider (user) via full chain: aboutId -> space -> l0Space -> account -> user', async () => {
      // Call 1: load spaces by about.id
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        // Call 2: load L0 spaces with account
        .mockResolvedValueOnce([makeL0SpaceRow('l0-1', 'acc-1')]);
      // Call 3: load users
      db.query.users.findMany.mockResolvedValueOnce([
        { id: 'user-1', accountID: 'acc-1', nameID: 'provider-user' },
      ]);
      // Call 4: load orgs (parallel)
      db.query.organizations.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
    });

    it('should resolve provider (organization) when no user found', async () => {
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([makeL0SpaceRow('l0-1', 'acc-1')]);
      db.query.users.findMany.mockResolvedValueOnce([]);
      db.query.organizations.findMany.mockResolvedValueOnce([
        { id: 'org-1', accountID: 'acc-1', nameID: 'provider-org' },
      ]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('org-1');
    });

    it('should give user precedence over organization when both exist for same account', async () => {
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([makeL0SpaceRow('l0-1', 'acc-1')]);
      db.query.users.findMany.mockResolvedValueOnce([
        { id: 'user-1', accountID: 'acc-1' },
      ]);
      db.query.organizations.findMany.mockResolvedValueOnce([
        { id: 'org-1', accountID: 'acc-1' },
      ]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      // User should take precedence (set after org in the map)
      expect(result!.id).toBe('user-1');
    });

    it('should batch multiple spaces and deduplicate L0 lookups', async () => {
      // Two subspaces under the same L0
      db.query.spaces.findMany
        .mockResolvedValueOnce([
          makeSpaceRow('s-1', 'about-1', 'l0-shared'),
          makeSpaceRow('s-2', 'about-2', 'l0-shared'),
        ])
        .mockResolvedValueOnce([makeL0SpaceRow('l0-shared', 'acc-1')]);
      db.query.users.findMany.mockResolvedValueOnce([
        { id: 'user-1', accountID: 'acc-1' },
      ]);
      db.query.organizations.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Both subspaces should resolve to the same provider
      expect(r1!.id).toBe('user-1');
      expect(r2!.id).toBe('user-1');
    });

    it('should return results in input order', async () => {
      // Return spaces in reverse order
      db.query.spaces.findMany
        .mockResolvedValueOnce([
          makeSpaceRow('s-2', 'about-2', 'l0-2'),
          makeSpaceRow('s-1', 'about-1', 'l0-1'),
        ])
        .mockResolvedValueOnce([
          makeL0SpaceRow('l0-2', 'acc-2'),
          makeL0SpaceRow('l0-1', 'acc-1'),
        ]);
      db.query.users.findMany.mockResolvedValueOnce([
        { id: 'u-1', accountID: 'acc-1' },
        { id: 'u-2', accountID: 'acc-2' },
      ]);
      db.query.organizations.findMany.mockResolvedValueOnce([]);

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
      db.query.spaces.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();
      const result = await loader.load('about-nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when L0 space has no account', async () => {
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([{ id: 'l0-1', account: undefined }]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should return null when no user or org matches the account', async () => {
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([makeL0SpaceRow('l0-1', 'acc-1')]);
      db.query.users.findMany.mockResolvedValueOnce([]);
      db.query.organizations.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();
      const result = await loader.load('about-1');

      expect(result).toBeNull();
    });

    it('should skip user/org lookup when no accounts are found', async () => {
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([{ id: 'l0-1', account: undefined }]);

      const loader = creator.create();
      await loader.load('about-1');

      // User/Org queries should be skipped (accountIdArray is empty)
      expect(db.query.users.findMany).not.toHaveBeenCalled();
      expect(db.query.organizations.findMany).not.toHaveBeenCalled();
    });

    it('should skip L0 lookup when no spaces found for about IDs', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();
      await loader.load('about-nonexistent');

      // Only 1 findMany call: initial space lookup returns empty -> no L0 lookup
      expect(db.query.spaces.findMany).toHaveBeenCalledTimes(1);
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
      db.query.spaces.findMany
        .mockResolvedValueOnce([makeSpaceRow('s-1', 'about-1', 'l0-1')])
        .mockResolvedValueOnce([makeL0SpaceRow('l0-1', 'acc-1')]);
      db.query.users.findMany.mockResolvedValueOnce([
        { id: 'u-1', accountID: 'acc-1' },
      ]);
      db.query.organizations.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(result1).toBe(result2);
    });

    it('should handle space with undefined about property', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        { id: 'orphan', about: undefined, levelZeroSpaceID: 'l0-1' },
      ]);

      const loader = creator.create();
      const result = await loader.load('about-orphan');

      expect(result).toBeNull();
    });
  });
});
