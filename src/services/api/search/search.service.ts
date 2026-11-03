import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Space } from '@domain/space/space/space.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { SearchFilterInput, SearchInput } from './dto/inputs';
import { ISearchResult, ISearchResults } from './dto/results';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { SearchCategory } from './search.category';
import { paginateSearchHits, validateSearchParameters } from './util';

const DEFAULT_RESULT_SIZE = 4;
/**
 * The most Space / Subspace hits read to count and paginate a Spaces search.
 * Hits ranked below it are neither counted nor reachable.
 */
const SPACES_SCAN_LIMIT = 1000;

@Injectable()
export class SearchService {
  private readonly maxSearchResults: number;
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private searchExtractService: SearchExtractService,
    private searchResultService: SearchResultService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {
    this.maxSearchResults = this.configService.get('search.max_results', {
      infer: true,
    });
  }

  public async search(
    searchData: SearchInput,
    actorContext: ActorContext
  ): Promise<ISearchResults> {
    // set default filters if not provided
    // this will ensure straight forward way of processing of the search parameters without much branching
    if (!searchData.filters || searchData.filters.length === 0) {
      searchData.filters = buildDefaultSearchFilters();
    }

    validateSearchParameters(searchData, {
      maxSearchResults: this.maxSearchResults,
    });
    // check if the Space exists
    if (searchData.searchInSpaceFilter) {
      try {
        await this.entityManager.findOneByOrFail(Space, {
          id: searchData.searchInSpaceFilter,
        });
      } catch {
        throw new EntityNotFoundException(
          'Space with the given identifier not found',
          LogContext.SEARCH,
          { searchInSpaceFilter: searchData.searchInSpaceFilter }
        );
      }
    }
    // search only in the public available data if the user is not authenticated
    const onlyPublicResults = !actorContext.actorID;
    // Spaces are counted and paginated exactly (see searchSpaces) — except in a
    // space-scoped search, which resolves its Space hits differently.
    const spacesFilter = searchData.searchInSpaceFilter
      ? undefined
      : searchData.filters.find(
          filter => filter.category === SearchCategory.SPACES
        );
    const otherFilters = searchData.filters.filter(
      filter => filter !== spacesFilter
    );

    const [otherResults, spaces] = await Promise.all([
      otherFilters.length > 0
        ? this.searchExtractService.search(
            spacesFilter
              ? { ...searchData, filters: otherFilters }
              : searchData,
            onlyPublicResults
          )
        : [],
      spacesFilter
        ? this.searchSpaces(
            searchData.terms,
            spacesFilter,
            onlyPublicResults,
            actorContext
          )
        : undefined,
    ]);
    // Callout-level folding: a matching post/whiteboard/memo folds up to its
    // containing callout, deduped, in calloutResults (FR-017). Triggered either
    // by a flow-state scoped search, or by an explicit foldCalloutResources opt-in
    // that widens a Callout search to match in its framing resources and
    // contributions.
    const foldToCallouts =
      Boolean(searchData.searchInFlowStateFilter) ||
      Boolean(searchData.foldCalloutResources);

    const results = await this.searchResultService.resolveSearchResults(
      spaces ? [...otherResults, ...spaces.page] : otherResults,
      actorContext,
      searchData.filters,
      searchData.searchInSpaceFilter,
      { foldToCallouts }
    );

    if (spaces) {
      results.spaceResults.total = spaces.total;
      if (!spaces.hasMore) {
        results.spaceResults.cursor = undefined;
      }
    }

    return results;
  }

  /**
   * One page of the Space / Subspace hits, plus how many there are in total.
   * Elasticsearch cannot tell which hits the actor may see (that is decided by
   * the authorization policies in the database), so every hit is read, the
   * invisible ones are dropped, and the page is cut from what is left. Only the
   * page's hits are then highlighted for their matched terms.
   */
  private async searchSpaces(
    terms: string[],
    filter: SearchFilterInput,
    onlyPublicResults: boolean,
    actorContext: ActorContext
  ): Promise<{ page: ISearchResult[]; total: number; hasMore: boolean }> {
    const hits = await this.searchExtractService.searchAllHits(
      terms,
      filter,
      onlyPublicResults,
      SPACES_SCAN_LIMIT
    );
    if (hits.length === SPACES_SCAN_LIMIT) {
      this.logger.warn?.(
        `Spaces search reached the scan limit of ${SPACES_SCAN_LIMIT} hits; lower ranked hits are not counted`,
        LogContext.SEARCH
      );
    }

    const visibleHits = await this.searchResultService.filterVisibleSpaceHits(
      hits,
      actorContext
    );
    const { page, hasMore } = paginateSearchHits(
      visibleHits,
      filter.cursor,
      filter.size
    );
    const termsById = await this.searchExtractService.getMatchedTerms(
      terms,
      filter,
      onlyPublicResults,
      page.map(hit => hit.result.id)
    );

    return {
      page: page.map(hit => ({
        ...hit,
        terms: termsById.get(hit.result.id) ?? [],
      })),
      total: visibleHits.length,
      hasMore,
    };
  }
}

const buildDefaultSearchFilters = (): SearchFilterInput[] => {
  return Object.values(SearchCategory).map(category => ({
    category: category as SearchCategory,
    size: DEFAULT_RESULT_SIZE,
  }));
};
