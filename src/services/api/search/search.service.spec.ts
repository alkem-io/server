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
  let searchExtractService: {
    search: Mock;
    searchAllHits: Mock;
    getMatchedTerms: Mock;
  };
  let searchResultService: {
    resolveSearchResults: Mock;
    filterVisibleSpaceHits: Mock;
  };
  let entityManager: { findOneByOrFail: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
          useValue: {
            search: vi.fn().mockResolvedValue([]),
            searchAllHits: vi.fn().mockResolvedValue([]),
            getMatchedTerms: vi.fn().mockResolvedValue(new Map()),
          },
        },
        {
          provide: SearchResultService,
          useValue: {
            filterVisibleSpaceHits: vi.fn(async hits => hits),
            resolveSearchResults: vi.fn().mockResolvedValue({
              spaceResults: { results: [], cursor: 'resolved-cursor' },
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
        filters: [{ category: SearchCategory.CONTRIBUTORS, size: 5 }],
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
        filters: [{ category: SearchCategory.CONTRIBUTORS, size: 5 }],
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
        filters: [{ category: SearchCategory.CONTRIBUTORS, size: 5 }],
      } as any;

      await service.search(searchData, actorContext);

      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        mockResults,
        actorContext,
        searchData.filters,
        undefined,
        { foldToCallouts: false }
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
        'space-1',
        { foldToCallouts: false }
      );
    });

    it('enables callout folding when a flow-state scope is provided', async () => {
      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
        searchInFlowStateFilter: 'fs-1',
      } as any;

      await service.search(searchData, actorContext);

      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        expect.anything(),
        actorContext,
        searchData.filters,
        undefined,
        { foldToCallouts: true }
      );
    });

    it('enables callout folding when foldCalloutResources opt-in is set', async () => {
      const searchData = {
        terms: ['test'],
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
        foldCalloutResources: true,
      } as any;

      await service.search(searchData, actorContext);

      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        expect.anything(),
        actorContext,
        searchData.filters,
        undefined,
        { foldToCallouts: true }
      );
    });
  });

  describe('search for Spaces', () => {
    const actorContext = { actorID: 'user-1', credentials: [] } as any;
    const uuid = (n: number) =>
      `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const hit = (score: number, n: number) => ({
      id: `hit-${n}`,
      score,
      type: 'space',
      terms: [],
      result: { id: uuid(n) },
    });
    const spacesFilter = {
      category: SearchCategory.SPACES,
      size: 1,
      countTotal: true,
    };

    it('counts the visible hits and resolves only the requested page, with its matched terms', async () => {
      const [first, hidden, second] = [hit(9, 3), hit(8, 2), hit(7, 1)];
      searchExtractService.searchAllHits.mockResolvedValue([
        first,
        hidden,
        second,
      ]);
      searchResultService.filterVisibleSpaceHits.mockResolvedValue([
        first,
        second,
      ]);
      searchExtractService.getMatchedTerms.mockResolvedValue(
        new Map([[first.result.id, ['alpha']]])
      );

      const results = await service.search(
        { terms: ['alpha'], filters: [spacesFilter] } as any,
        actorContext
      );

      expect(searchExtractService.getMatchedTerms).toHaveBeenCalledWith(
        ['alpha'],
        spacesFilter,
        false,
        [first.result.id],
        'user-1'
      );
      expect(searchExtractService.searchAllHits).toHaveBeenCalledWith(
        ['alpha'],
        spacesFilter,
        false,
        1000,
        'user-1'
      );
      expect(searchResultService.resolveSearchResults).toHaveBeenCalledWith(
        [{ ...first, terms: ['alpha'] }],
        actorContext,
        [spacesFilter],
        undefined,
        { foldToCallouts: false }
      );
      expect(results.spaceResults.total).toBe(2);
      // taken from the cut page, not from what resolved of it
      expect(results.spaceResults.cursor).toBe(`9::${first.result.id}`);
    });

    it('keeps the cursor when the page did not resolve, so pagination does not end early', async () => {
      const [first, second] = [hit(9, 2), hit(7, 1)];
      searchExtractService.searchAllHits.mockResolvedValue([first, second]);
      searchResultService.resolveSearchResults.mockResolvedValueOnce({
        spaceResults: { results: [], cursor: undefined, total: -1 },
      });

      const results = await service.search(
        { terms: ['alpha'], filters: [spacesFilter] } as any,
        actorContext
      );

      expect(results.spaceResults.cursor).toBe(`9::${first.result.id}`);
    });

    it('reports an unknown total (-1), not zero, when the Spaces scan fails', async () => {
      searchExtractService.searchAllHits.mockRejectedValue(
        new Error('es down')
      );

      const results = await service.search(
        { terms: ['alpha'], filters: [spacesFilter] } as any,
        actorContext
      );

      expect(results.spaceResults.total).toBe(-1);
      expect(results.spaceResults.cursor).toBeUndefined();
      expect(searchExtractService.getMatchedTerms).not.toHaveBeenCalled();
    });

    it('does not scan or count the Spaces unless countTotal is set', async () => {
      const filters = [{ category: SearchCategory.SPACES, size: 4 }];

      await service.search({ terms: ['alpha'], filters } as any, actorContext);

      expect(searchExtractService.searchAllHits).not.toHaveBeenCalled();
      expect(searchExtractService.search).toHaveBeenCalledWith(
        expect.objectContaining({ filters }),
        false
      );
    });

    it('does not scan the Spaces for the default filters', async () => {
      await service.search({ terms: ['alpha'] } as any, actorContext);

      expect(searchExtractService.searchAllHits).not.toHaveBeenCalled();
    });

    it('returns no cursor on the last page', async () => {
      searchExtractService.searchAllHits.mockResolvedValue([hit(9, 1)]);

      const results = await service.search(
        { terms: ['alpha'], filters: [spacesFilter] } as any,
        actorContext
      );

      expect(results.spaceResults.total).toBe(1);
      expect(results.spaceResults.cursor).toBeUndefined();
    });

    it('searches the other categories without the Spaces filter', async () => {
      const contributorsFilter = {
        category: SearchCategory.CONTRIBUTORS,
        size: 4,
      };

      await service.search(
        {
          terms: ['alpha'],
          filters: [spacesFilter, contributorsFilter],
        } as any,
        actorContext
      );

      expect(searchExtractService.search).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [contributorsFilter] }),
        false
      );
    });

    it('does not run the multi search when Spaces is the only category', async () => {
      await service.search(
        { terms: ['alpha'], filters: [spacesFilter] } as any,
        actorContext
      );

      expect(searchExtractService.search).not.toHaveBeenCalled();
    });

    it('keeps a space-scoped search on the multi search', async () => {
      entityManager.findOneByOrFail.mockResolvedValue({ id: 'space-1' });
      const searchData = {
        terms: ['alpha'],
        filters: [spacesFilter],
        searchInSpaceFilter: 'space-1',
      } as any;

      await service.search(searchData, actorContext);

      expect(searchExtractService.searchAllHits).not.toHaveBeenCalled();
      expect(searchExtractService.search).toHaveBeenCalledWith(
        searchData,
        false
      );
    });
  });
});
