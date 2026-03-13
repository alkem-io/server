import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LibraryResolverFields } from './library.resolver.fields';
import { LibraryService } from './library.service';

describe('LibraryResolverFields', () => {
  let resolver: LibraryResolverFields;
  let libraryService: LibraryService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryResolverFields, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LibraryResolverFields);
    libraryService = module.get(LibraryService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('innovationPacks', () => {
    it('should delegate to libraryService.getListedInnovationPacks with query data', async () => {
      const packs = [{ id: 'pack-1' }];
      vi.mocked(libraryService.getListedInnovationPacks).mockResolvedValue(
        packs as any
      );

      const result = await resolver.innovationPacks({
        limit: 5,
        orderBy: 'RANDOM',
      } as any);

      expect(libraryService.getListedInnovationPacks).toHaveBeenCalledWith(
        5,
        'RANDOM'
      );
      expect(result).toBe(packs);
    });

    it('should delegate to libraryService.getListedInnovationPacks without query data', async () => {
      const packs = [{ id: 'pack-1' }];
      vi.mocked(libraryService.getListedInnovationPacks).mockResolvedValue(
        packs as any
      );

      const result = await resolver.innovationPacks();

      expect(libraryService.getListedInnovationPacks).toHaveBeenCalledWith(
        undefined,
        undefined
      );
      expect(result).toBe(packs);
    });
  });

  describe('templates', () => {
    it('should delegate to libraryService.getTemplatesInListedInnovationPacks with filter', async () => {
      const templates = [{ template: { id: 'tpl-1' } }];
      vi.mocked(
        libraryService.getTemplatesInListedInnovationPacks
      ).mockResolvedValue(templates as any);

      const filter = { types: ['post'] } as any;
      const result = await resolver.templates(filter);

      expect(
        libraryService.getTemplatesInListedInnovationPacks
      ).toHaveBeenCalledWith(filter);
      expect(result).toBe(templates);
    });

    it('should delegate to libraryService.getTemplatesInListedInnovationPacks without filter', async () => {
      const templates: any[] = [];
      vi.mocked(
        libraryService.getTemplatesInListedInnovationPacks
      ).mockResolvedValue(templates);

      const result = await resolver.templates();

      expect(
        libraryService.getTemplatesInListedInnovationPacks
      ).toHaveBeenCalledWith(undefined);
      expect(result).toBe(templates);
    });
  });

  describe('virtualContributors', () => {
    it('should delegate to libraryService.getListedVirtualContributors', async () => {
      const vcs = [{ id: 'vc-1' }];
      vi.mocked(libraryService.getListedVirtualContributors).mockResolvedValue(
        vcs as any
      );

      const result = await resolver.virtualContributors();

      expect(
        libraryService.getListedVirtualContributors
      ).toHaveBeenCalledOnce();
      expect(result).toBe(vcs);
    });
  });

  describe('innovationHubs', () => {
    it('should delegate to libraryService.getListedInnovationHubs', async () => {
      const hubs = [{ id: 'hub-1' }];
      vi.mocked(libraryService.getListedInnovationHubs).mockResolvedValue(
        hubs as any
      );

      const result = await resolver.innovationHubs();

      expect(libraryService.getListedInnovationHubs).toHaveBeenCalledOnce();
      expect(result).toBe(hubs);
    });
  });
});
