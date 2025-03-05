import { intersectionWith } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { LogContext } from '@common/enums';
import { ISearchResult } from '../dto/results';
import { SearchInput } from '../dto/inputs';
import { buildSearchQuery } from './build.search.query';
import { SearchResultType } from '../search.result.type';
import { AlkemioConfig } from '@src/types';
import { getIndexPattern } from '@services/api/search/ingest/get.index.pattern';
import {
  ErrorResponseBase,
  MsearchMultiSearchItem,
  MsearchResponse,
  MsearchResponseItem,
} from '@elastic/elasticsearch/lib/api/types';
import { isElasticError } from '@services/external/elasticsearch/utils';
import { SearchCategory } from '../search.category';
import { SearchFilterInput } from '../dto/inputs';
import { SearchIndex } from './search.index';
import { buildMultiSearchRequestItems } from './build.multi.search.request.items';

const getIndexStore = (
  indexPattern: string
): Record<SearchCategory, SearchIndex[]> => ({
  [SearchCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultType.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultType.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.CONTRIBUTORS]: [
    {
      name: `${indexPattern}users`,
      type: SearchResultType.USER,
      category: SearchCategory.CONTRIBUTORS,
    },
    {
      name: `${indexPattern}organizations`,
      type: SearchResultType.ORGANIZATION,
      category: SearchCategory.CONTRIBUTORS,
    },
  ],
  [SearchCategory.COLLABORATION_TOOLS]: [
    {
      name: `${indexPattern}callouts`,
      type: SearchResultType.CALLOUT,
      category: SearchCategory.COLLABORATION_TOOLS,
    },
  ],
  [SearchCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultType.POST,
      category: SearchCategory.RESPONSES,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.RESPONSES,
    },
  ],
});
const getPublicIndexStore = (
  indexPattern: string
): Partial<Record<SearchCategory, SearchIndex[]>> => ({
  [SearchCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultType.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultType.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultType.POST,
      category: SearchCategory.RESPONSES,
    },
    // todo: check if whiteboards should be added to the public results
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.RESPONSES,
    },
  ],
});

@Injectable()
export class SearchExtractService {
  private readonly indexPattern: string;
  private readonly maxResults: number;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private client: ElasticClient | undefined,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.indexPattern = getIndexPattern(this.configService);
    this.maxResults = this.configService.get('search.max_results', {
      infer: true,
    });

    if (!client) {
      this.logger.error(
        'Elasticsearch client not initialized',
        undefined,
        LogContext.SEARCH_EXTRACT
      );
      return;
    }
  }

  public async search(
    searchData: SearchInput,
    onlyPublicResults = false
  ): Promise<ISearchResult[] | never> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    const { terms, searchInSpaceFilter, filters } = searchData;
    const indicesToSearchOn = this.getIndices(onlyPublicResults, filters);

    if (indicesToSearchOn.length === 0) {
      return [];
    }

    // execute search per category
    const result = await this.executeMultiSearch(indicesToSearchOn, terms, {
      searchInSpaceFilter,
      filters,
    });

    return this.processMultiSearchResponses(result.responses);
  }

  private getIndices(
    onlyPublicResults = false,
    filters?: SearchFilterInput[]
  ): SearchIndex[] {
    const categories = filters
      ?.map(filter => filter.category)
      .filter((category): category is SearchCategory => !!category);
    const types = filters
      ?.flatMap(filter => filter.types)
      .filter((type): type is SearchResultType => !!type);
    const indexStore = getIndexStore(this.indexPattern);

    const filteredIndicesByCategory =
      categories && categories.length > 0
        ? categories.flatMap(category => indexStore[category])
        : Object.values(indexStore).flat();

    const filteredIndicesByCategoryAndType =
      types && types.length > 0
        ? filteredIndicesByCategory.filter(index =>
            types.some(type => type === index.type)
          )
        : filteredIndicesByCategory;

    if (onlyPublicResults) {
      const publicIndices = Object.values(
        getPublicIndexStore(this.indexPattern)
      ).flat();
      // if we want only public results - filter the public indices with the user defined filter
      return intersectionWith(
        filteredIndicesByCategoryAndType,
        publicIndices,
        (a, b) => a.name === b.name
      );
    }
    // these indices may include private data
    return filteredIndicesByCategoryAndType;
  }

  /***
   https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html
   The multi search API executes several searches from a single API request.
   The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
   The structure is as follows:
   ```
   header\n
   body\n
   header\n
   body\n
   ```
   */
  private async executeMultiSearch(
    indicesToSearchOn: SearchIndex[],
    terms: string[],
    options?: {
      searchInSpaceFilter?: string;
      filters?: SearchFilterInput[];
    }
  ): Promise<MsearchResponse<IBaseAlkemio>> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    if (indicesToSearchOn.length === 0) {
      throw new Error('No indices to search on');
    }

    const {
      searchInSpaceFilter,
      filters,
      // size = this.maxResults,
      // cursor,
    } = options ?? {};

    const term = terms.join(' ');
    // the main search query built using query DSL
    const query = buildSearchQuery(term, {
      spaceIdFilter: searchInSpaceFilter,
    });

    const categoriesRequested = filters?.length ?? 0;
    const searchRequests = buildMultiSearchRequestItems(
      indicesToSearchOn,
      query,
      {
        filters,
        defaults: {
          // split the max results between the categories to prevent overfetching
          size: this.maxResults / categoriesRequested,
        },
      }
    );

    return this.client.msearch<IBaseAlkemio>({
      searches: searchRequests,
      // other msearch config goes here
    });
  }

  private processMultiSearchResponses(
    responses: MsearchResponseItem<IBaseAlkemio>[]
  ): ISearchResult[] {
    const results = responses.flatMap(
      (response: MsearchMultiSearchItem<IBaseAlkemio> | ErrorResponseBase) => {
        if (isElasticError(response)) {
          this.processMultiSearchError(response);
          return undefined;
        }

        return this.processMultiSearchItem(response);
      }
    );
    // filter the undefined produced by processing errors
    return results.filter((result): result is ISearchResult => !!result);
  }

  private processMultiSearchItem(
    item: MsearchMultiSearchItem
  ): ISearchResult[] {
    return item.hits.hits.map<ISearchResult>(hit => {
      const entityId = hit.fields?.id?.[0];
      const type = hit.fields?.type?.[0];

      if (!entityId) {
        this.logger.error(
          `Search result with no entity id: ${JSON.stringify(hit)}`,
          undefined,
          LogContext.SEARCH_EXTRACT
        );
      }

      if (hit._ignored) {
        const ignored = hit._ignored.join('; ');
        this.logger.warn(
          `Some fields were ignored while searching: ${ignored}`,
          undefined,
          LogContext.SEARCH_EXTRACT
        );
      }

      return {
        id: hit._id ?? 'N/A',
        score: hit._score ?? -1,
        type,
        terms: [], // todo - https://github.com/alkem-io/server/issues/3702
        result: { id: entityId ?? 'N/A' },
      };
    });
  }

  private processMultiSearchError(error: ErrorResponseBase): void {
    this.logger.error(
      {
        message: 'Error response for multi search request',
        ...error,
      },
      undefined,
      LogContext.SEARCH_EXTRACT
    );
  }
}
