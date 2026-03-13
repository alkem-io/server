import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { SpaceResolverFields } from './space.resolver.fields';
import { SpaceService } from './space.service';

describe('SpaceResolverFields', () => {
  let resolver: SpaceResolverFields;
  let spaceService: SpaceService;
  let spaceLookupService: SpaceLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(SpaceResolverFields);
    spaceService = module.get(SpaceService);
    spaceLookupService = module.get(SpaceLookupService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('platformAccess', () => {
    it('should return platformRolesAccess when defined', () => {
      const space = {
        platformRolesAccess: { roles: ['role1'] },
      } as any;

      const result = resolver.platformAccess(space);
      expect(result).toEqual({ roles: ['role1'] });
    });

    it('should return empty roles when platformRolesAccess is undefined', () => {
      const space = { platformRolesAccess: undefined } as any;

      const result = resolver.platformAccess(space);
      expect(result).toEqual({ roles: [] });
    });
  });

  describe('subscriptions', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1' } as any;
      const subs = [{ name: 'sub-1' }] as any;
      vi.mocked(spaceService.getSubscriptions).mockResolvedValue(subs);

      const result = await resolver.subscriptions(space);
      expect(result).toBe(subs);
    });
  });

  describe('activeSubscription', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1' } as any;
      const sub = { name: 'sub-1' } as any;
      vi.mocked(spaceService.activeSubscription).mockResolvedValue(sub);

      const result = await resolver.activeSubscription(space);
      expect(result).toBe(sub);
    });
  });

  describe('storageAggregator', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1' } as any;
      const sa = { id: 'sa-1' } as any;
      vi.mocked(spaceService.getStorageAggregatorOrFail).mockResolvedValue(sa);

      const result = await resolver.storageAggregator(space);
      expect(result).toBe(sa);
    });
  });

  describe('sortMode', () => {
    it('should return sortMode from space settings when available', async () => {
      const space = {
        id: 'space-1',
        settings: { sortMode: SpaceSortMode.CUSTOM },
      } as any;

      const result = await resolver.sortMode(space);
      expect(result).toBe(SpaceSortMode.CUSTOM);
    });

    it('should load space and return sortMode when settings not on entity', async () => {
      const space = { id: 'space-1', settings: undefined } as any;
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        settings: { sortMode: SpaceSortMode.CUSTOM },
      } as any);

      const result = await resolver.sortMode(space);
      expect(result).toBe(SpaceSortMode.CUSTOM);
    });

    it('should default to ALPHABETICAL when loaded space has no sortMode', async () => {
      const space = { id: 'space-1', settings: undefined } as any;
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        settings: {},
      } as any);

      const result = await resolver.sortMode(space);
      expect(result).toBe(SpaceSortMode.ALPHABETICAL);
    });

    it('should return ALPHABETICAL when settings.sortMode is falsy', async () => {
      const space = {
        id: 'space-1',
        settings: { sortMode: undefined },
      } as any;
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        settings: { sortMode: undefined },
      } as any);

      const result = await resolver.sortMode(space);
      expect(result).toBe(SpaceSortMode.ALPHABETICAL);
    });
  });

  describe('subspaces', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1' } as any;
      const subspaces = [{ id: 'sub-1' }] as any;
      vi.mocked(spaceService.getSubspaces).mockResolvedValue(subspaces);

      const result = await resolver.subspaces(space, {} as any);
      expect(result).toBe(subspaces);
    });
  });

  describe('account', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1' } as any;
      const account = { id: 'account-1' } as any;
      vi.mocked(
        spaceService.getAccountForLevelZeroSpaceOrFail
      ).mockResolvedValue(account);

      const result = await resolver.account(space);
      expect(result).toBe(account);
    });
  });

  describe('subspace (subspaceByNameID)', () => {
    it('should return subspace when found', async () => {
      const space = {
        id: 'space-1',
        levelZeroSpaceID: 'space-1',
      } as any;
      const subspace = { id: 'sub-1' } as any;
      const actorContext = { actorID: 'actor-1' } as any;

      vi.mocked(
        spaceLookupService.getSubspaceByNameIdInLevelZeroSpace
      ).mockResolvedValue(subspace);

      const result = await resolver.subspace('sub-name', actorContext, space);
      expect(result).toBe(subspace);
    });

    it('should throw EntityNotFoundException when subspace not found', async () => {
      const space = {
        id: 'space-1',
        levelZeroSpaceID: 'space-1',
      } as any;
      const actorContext = { actorID: 'actor-1' } as any;

      vi.mocked(
        spaceLookupService.getSubspaceByNameIdInLevelZeroSpace
      ).mockResolvedValue(null as any);

      await expect(
        resolver.subspace('missing-name', actorContext, space)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createdDate', () => {
    it('should return createdDate as Date object', async () => {
      const space = { createdDate: '2024-01-01T00:00:00Z' } as any;

      const result = await resolver.createdDate(space);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('settings', () => {
    it('should return settings with explicit sortMode preserved', async () => {
      const space = {
        id: 'space-1',
        settings: {
          privacy: { mode: 'public' },
          sortMode: SpaceSortMode.CUSTOM,
        },
      } as any;

      const result = await resolver.settings(space);
      expect(result.sortMode).toBe(SpaceSortMode.CUSTOM);
      expect(result.privacy).toEqual({ mode: 'public' });
    });

    it('should load settings from service when not available on space', async () => {
      const space = { id: 'space-1', settings: undefined } as any;
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        settings: { privacy: { mode: 'public' } },
      } as any);

      const result = await resolver.settings(space);
      expect(result.sortMode).toBe(SpaceSortMode.ALPHABETICAL);
    });

    it('should default sortMode to ALPHABETICAL when not set in settings', async () => {
      const space = {
        id: 'space-1',
        settings: { privacy: { mode: 'public' }, sortMode: undefined },
      } as any;

      const result = await resolver.settings(space);
      expect(result.sortMode).toBe(SpaceSortMode.ALPHABETICAL);
    });
  });

  describe('templatesManager', () => {
    it('should delegate to spaceService', async () => {
      const space = { id: 'space-1', levelZeroSpaceID: 'space-1' } as any;
      const tm = { id: 'tm-1' } as any;
      vi.mocked(spaceService.getTemplatesManagerOrFail).mockResolvedValue(tm);

      const result = await resolver.templatesManager(space);
      expect(result).toBe(tm);
    });
  });
});
