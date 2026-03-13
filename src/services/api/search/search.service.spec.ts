import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { SearchCategory } from './search.category';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let searchExtractService: { search: Mock };
  let searchResultService: { resolveSearchResults: Mock };
  let entityManager: { findOneByOrFail: Mock };

  beforeEach(async () => {
    entityManager = {
      findOneByOrFail: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        {
          provide: SearchExtractService,
          useValue: { search: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: SearchResultService,
          useValue: {
            resolveSearchResults: vi.fn().mockResolvedValue({
              spaceResults: { results: [] },
              actorResults: { results: [] },
              contributionResults: { results: [] },
              calloutResults: { results: [] },
              framingResults: { results: [] },
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'search.max_results') return 50;
              return undefined;
            }),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SearchService>(SearchService);
    searchExtractService = module.get(SearchExtractService) as any;
    searchResultService = module.get(SearchResultService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    const actorContext = { actorID: 'user-1', credentials: [] } as any;

    it('should set default filters when none are provided', async () => {
      const searchData = { terms: ['test'] } as any;

      await service.search(searchData, actorContext);

      // Filters should have been populated with all categories
      expect(searchData.filters).toBeDefined();
      expect(searchData.filters.length).toBe(
        Object.values(SearchCategory).length
      );
    });

    it('should set default filters when filters array is empty', async () => {
      const searchData = { terms: ['test'], filters: [] } as any;

      await service.search(searchData, actorContext);

      expect(searchData.filters.length).toBe(
        Object.values(SearchCategory).length
      );
    });

    it('should keep provided filters', async () => {
      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any;

      await service.search(searchData, actorContext);

      expect(searchData.filters).toHaveLength(1);
    });

    it('should call searchExtractService.search with onlyPublicResults=false for authenticated users', async () => {
      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any;

      await service.search(searchData, actorContext);

      expect(searchExtractService.search).toHaveBeenCalledWith(
        searchData,
        false
      );
    });

    it('should call searchExtractService.search with onlyPublicResults=true for unauthenticated users', async () => {
      const unauthContext = { actorID: undefined, credentials: [] } as any;
      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any;

      await service.search(searchData, unauthContext);

      expect(searchExtractService.search).toHaveBeenCalledWith(
        searchData,
        true
      );
    });

    it('should pass results to searchResultService.resolveSearchResults', async () => {
      const mockResults = [{ id: 'r1', score: 5 }];
      searchExtractService.search.mockResolvedValue(mockResults);

      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any;

      await service.search(searchData, actorContext);

      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        mockResults,
        actorContext,
        searchData.filters,
        undefined
      );
    });

    it('should validate the space exists when searchInSpaceFilter is set', async () => {
      entityManager.findOneByOrFail.mockResolvedValue({ id: 'space-1' });

      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
        searchInSpaceFilter: 'space-1',
      } as any;

      await service.search(searchData, actorContext);

      expect(entityManager.findOneByOrFail).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when space is not found', async () => {
      entityManager.findOneByOrFail.mockRejectedValue(new Error('not found'));

      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
        searchInSpaceFilter: 'space-999',
      } as any;

      await expect(service.search(searchData, actorContext)).rejects.toThrow(
        'Space with the given identifier not found'
      );
    });

    it('should pass searchInSpaceFilter to resolveSearchResults', async () => {
      entityManager.findOneByOrFail.mockResolvedValue({ id: 'space-1' });

      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
        searchInSpaceFilter: 'space-1',
      } as any;

      await service.search(searchData, actorContext);

      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        expect.anything(),
        actorContext,
        searchData.filters,
        'space-1'
      );
    });
  });
});
