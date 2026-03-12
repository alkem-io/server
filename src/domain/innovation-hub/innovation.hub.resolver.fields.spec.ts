import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
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

  beforeEach(async () => {
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
  });

  describe('spaceListFilter', () => {
    it('should return spaces in the order specified by the filter', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const filter = ['space-2', 'space-1', 'space-3'];

      (innovationHubService as any).getSpaceListFilterOrFail = vi
        .fn()
        .mockResolvedValue(filter);

      const spaces = [
        { id: 'space-1', nameID: 'first' },
        { id: 'space-2', nameID: 'second' },
        { id: 'space-3', nameID: 'third' },
      ];
      (spaceLookupService as any).getSpacesById = vi
        .fn()
        .mockResolvedValue(spaces);

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

      (innovationHubService as any).getSpaceListFilterOrFail = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act
      const result = await resolver.spaceListFilter(innovationHub);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should skip spaces that are not found in the lookup', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const filter = ['space-1', 'space-missing', 'space-2'];

      (innovationHubService as any).getSpaceListFilterOrFail = vi
        .fn()
        .mockResolvedValue(filter);

      const spaces = [
        { id: 'space-1', nameID: 'first' },
        { id: 'space-2', nameID: 'second' },
      ];
      (spaceLookupService as any).getSpacesById = vi
        .fn()
        .mockResolvedValue(spaces);

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

  describe('provider', () => {
    it('should delegate to innovationHubService.getProvider', async () => {
      // Arrange
      const innovationHub = { id: 'hub-1' } as IInnovationHub;
      const mockProvider = { id: 'provider-1', nameID: 'org-1' };

      (innovationHubService as any).getProvider = vi
        .fn()
        .mockResolvedValue(mockProvider);

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
