import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Space } from '@domain/space/space/space.entity';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { spaces } from '@domain/space/space/space.schema';
import { SearchFilterInput, SearchInput } from './dto/inputs';
import { ISearchResults } from './dto/results';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { SearchCategory } from './search.category';
import { validateSearchParameters } from './util';

const DEFAULT_RESULT_SIZE = 4;

@Injectable()
export class SearchService {
  private readonly maxSearchResults: number;
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private searchExtractService: SearchExtractService,
    private searchResultService: SearchResultService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.maxSearchResults = this.configService.get('search.max_results', {
      infer: true,
    });
  }

  public async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
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
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.id, searchData.searchInSpaceFilter),
      });
      if (!space) {
        throw new EntityNotFoundException(
          'Space with the given identifier not found',
          LogContext.SEARCH,
          { searchInSpaceFilter: searchData.searchInSpaceFilter }
        );
      }
    }
    // search only in the public available data if the user is not authenticated
    const onlyPublicResults = !agentInfo.email;
    const searchResults = await this.searchExtractService.search(
      searchData,
      onlyPublicResults
    );
    return this.searchResultService.resolveSearchResults(
      searchResults,
      agentInfo,
      searchData.filters,
      searchData.searchInSpaceFilter
    );
  }
}

const buildDefaultSearchFilters = (): SearchFilterInput[] => {
  return Object.values(SearchCategory).map(category => ({
    category: category as SearchCategory,
    size: DEFAULT_RESULT_SIZE,
  }));
};
