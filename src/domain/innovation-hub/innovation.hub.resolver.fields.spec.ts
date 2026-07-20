import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IInnovationHub } from './innovation.hub.interface';
import { InnovationHubResolverFields } from './innovation.hub.resolver.fields';
import { InnovationHubService } from './innovation.hub.service';

describe('InnovationHubResolverFields', () => {
  let resolver: InnovationHubResolverFields;
  let innovationHubService: InnovationHubService;
  let spaceLookupService: SpaceLookupService;
  let innovationPackService: InnovationPackService;
  let virtualContributorLookupService: VirtualContributorLookupService;
  let authorizationService: AuthorizationService;

  const actorContext = { credentials: [] } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationHubResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationHubResolverFields);
    innovationHubService = module.get(InnovationHubService);
    spaceLookupService = module.get(SpaceLookupService);
    innovationPackService = module.get(InnovationPackService);
    virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    );
    authorizationService = module.get(AuthorizationService);
  });

  describe('spaceListFilter', () => {
    it('should return spaces in the order specified by the filter', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const filter = ['space-2', 'space-1', 'space-3'];

      (innovationHubService as any).getSpaceListFilterOrFail.mockResolvedValue(
        filter
      );

      const spaces = [
        { id: 'space-1', nameID: 'first' },
        { id: 'space-2', nameID: 'second' },
        { id: 'space-3', nameID: 'third' },
      ];
      (spaceLookupService as any).getSpacesById.mockResolvedValue(spaces);

      // Act
      const result = await resolver.spaceListFilter(innovationHub);

      // Assert
      expect(result).toHaveLength(3);
      expect(result![0].id).toBe('space-2');
      expect(result![1].id).toBe('space-1');
      expect(result![2].id).toBe('space-3');
    });

    it('should return undefined when filter is null/undefined', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;

      (innovationHubService as any).getSpaceListFilterOrFail.mockResolvedValue(
        undefined
      );

      // Act
      const result = await resolver.spaceListFilter(innovationHub);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should skip spaces that are not found in the lookup', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const filter = ['space-1', 'space-missing', 'space-2'];

      (innovationHubService as any).getSpaceListFilterOrFail.mockResolvedValue(
        filter
      );

      const spaces = [
        { id: 'space-1', nameID: 'first' },
        { id: 'space-2', nameID: 'second' },
      ];
      (spaceLookupService as any).getSpacesById.mockResolvedValue(spaces);

      // Act
      const result = await resolver.spaceListFilter(innovationHub);

      // Assert
      expect(result).toHaveLength(2);
      expect(result![0].id).toBe('space-1');
      expect(result![1].id).toBe('space-2');
    });

    it('should call getSpaceListFilterOrFail with the hub id', async () => {
      // Arrange
      const innovationHub = { id: 'hub-42' } as IInnovationHub;

      const getFilterSpy = vi.fn().mockResolvedValue(undefined);
      (innovationHubService as any).getSpaceListFilterOrFail = getFilterSpy;

      // Act
      await resolver.spaceListFilter(innovationHub);

      // Assert
      expect(getFilterSpy).toHaveBeenCalledWith('hub-42');
    });
  });

  describe('innovationPackListFilter', () => {
    const grantAll = () => {
      (authorizationService as any).isAccessGranted.mockReturnValue(true);
    };

    it('should return packs in stored (curated) order', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue([
        'pack-2',
        'pack-1',
        'pack-3',
      ]);
      (innovationPackService as any).getInnovationPacksByIds.mockResolvedValue([
        { id: 'pack-1', authorization: { id: 'auth-1' } },
        { id: 'pack-2', authorization: { id: 'auth-2' } },
        { id: 'pack-3', authorization: { id: 'auth-3' } },
      ]);
      grantAll();

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result?.map(p => p.id)).toEqual(['pack-2', 'pack-1', 'pack-3']);
    });

    it('should silently skip dangling pack IDs', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue([
        'pack-1',
        'pack-deleted',
        'pack-2',
      ]);
      (innovationPackService as any).getInnovationPacksByIds.mockResolvedValue([
        { id: 'pack-1', authorization: { id: 'auth-1' } },
        { id: 'pack-2', authorization: { id: 'auth-2' } },
      ]);
      grantAll();

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result?.map(p => p.id)).toEqual(['pack-1', 'pack-2']);
    });

    it('should filter out packs the requesting agent may not READ', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue([
        'pack-public',
        'pack-hidden',
      ]);
      (innovationPackService as any).getInnovationPacksByIds.mockResolvedValue([
        { id: 'pack-public', authorization: { id: 'auth-public' } },
        { id: 'pack-hidden', authorization: { id: 'auth-hidden' } },
      ]);
      (authorizationService as any).isAccessGranted.mockImplementation(
        (_actor: unknown, authorization: { id: string }) =>
          authorization.id === 'auth-public'
      );

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result?.map(p => p.id)).toEqual(['pack-public']);
    });

    it('should skip packs without an authorization policy', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue(['pack-1']);
      (innovationPackService as any).getInnovationPacksByIds.mockResolvedValue([
        { id: 'pack-1', authorization: undefined },
      ]);
      grantAll();

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should return undefined when the stored filter is null/undefined (never seeded)', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue(undefined);

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return an empty array for an empty stored list', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getInnovationPackListFilterOrFail.mockResolvedValue([]);
      (innovationPackService as any).getInnovationPacksByIds.mockResolvedValue(
        []
      );

      // Act
      const result = await resolver.innovationPackListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('virtualContributorListFilter', () => {
    it('should return VCs in stored (curated) order, skipping dangling IDs', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getVirtualContributorListFilterOrFail.mockResolvedValue([
        'vc-2',
        'vc-deleted',
        'vc-1',
      ]);
      (
        virtualContributorLookupService as any
      ).getVirtualContributorsByIds.mockResolvedValue([
        { id: 'vc-1', authorization: { id: 'auth-1' } },
        { id: 'vc-2', authorization: { id: 'auth-2' } },
      ]);
      (authorizationService as any).isAccessGranted.mockReturnValue(true);

      // Act
      const result = await resolver.virtualContributorListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result?.map(vc => vc.id)).toEqual(['vc-2', 'vc-1']);
    });

    it('should filter out VCs the requesting agent may not READ (e.g. hidden for anonymous)', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getVirtualContributorListFilterOrFail.mockResolvedValue([
        'vc-public',
        'vc-hidden',
      ]);
      (
        virtualContributorLookupService as any
      ).getVirtualContributorsByIds.mockResolvedValue([
        { id: 'vc-public', authorization: { id: 'auth-public' } },
        { id: 'vc-hidden', authorization: { id: 'auth-hidden' } },
      ]);
      (authorizationService as any).isAccessGranted.mockImplementation(
        (_actor: unknown, authorization: { id: string }) =>
          authorization.id === 'auth-public'
      );

      // Act
      const result = await resolver.virtualContributorListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result?.map(vc => vc.id)).toEqual(['vc-public']);
    });

    it('should return undefined when the stored filter is null/undefined (never seeded)', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getVirtualContributorListFilterOrFail.mockResolvedValue(undefined);

      // Act
      const result = await resolver.virtualContributorListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return an empty array for an empty stored list', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      (
        innovationHubService as any
      ).getVirtualContributorListFilterOrFail.mockResolvedValue([]);
      (
        virtualContributorLookupService as any
      ).getVirtualContributorsByIds.mockResolvedValue([]);

      // Act
      const result = await resolver.virtualContributorListFilter(
        actorContext,
        innovationHub
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('provider', () => {
    it('should delegate to innovationHubService.getProvider', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const mockProvider = { id: 'provider-1', nameID: 'org-1' };

      (innovationHubService as any).getProvider.mockResolvedValue(mockProvider);

      // Act
      const result = await resolver.provider(innovationHub);

      // Assert
      expect(result).toBe(mockProvider);
      expect((innovationHubService as any).getProvider).toHaveBeenCalledWith(
        'hub-1'
      );
    });
  });
});
