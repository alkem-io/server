import { groupBy, intersectionWith } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { LogContext } from '@common/enums';
import { ISearchResult, SearchInput } from '../dto';
import { validateSearchParameters, validateSearchTerms } from '../util';
import { buildSearchQuery } from './build.search.query';
import { SearchResultTypes } from '../search.result.types';
import { AlkemioConfig } from '@src/types';
import { getIndexPattern } from '@services/api/search/ingest/get.index.pattern';
import {
  ErrorResponseBase,
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchMultiSearchItem,
  MsearchResponseItem,
} from '@elastic/elasticsearch/lib/api/types';
import { SearchCategory } from '../search.category';
import { SearchIndex } from './search.index';
import { isElasticError } from '@services/external/elasticsearch/utils';

const getIndexStore = (
  indexPattern: string
): Record<SearchCategory, SearchIndex[]> => ({
  [SearchCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultTypes.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultTypes.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.CONTRIBUTORS]: [
    {
      name: `${indexPattern}users`,
      type: SearchResultTypes.USER,
      category: SearchCategory.CONTRIBUTORS,
    },
    {
      name: `${indexPattern}organizations`,
      type: SearchResultTypes.ORGANIZATION,
      category: SearchCategory.CONTRIBUTORS,
    },
  ],
  [SearchCategory.COLLABORATION_TOOLS]: [
    {
      name: `${indexPattern}callouts`,
      type: SearchResultTypes.CALLOUT,
      category: SearchCategory.COLLABORATION_TOOLS,
    },
  ],
  [SearchCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultTypes.POST,
      category: SearchCategory.RESPONSES,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultTypes.WHITEBOARD,
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
      type: SearchResultTypes.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultTypes.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultTypes.POST,
      category: SearchCategory.RESPONSES,
    },
    // todo: check if whiteboards should be added to the public results
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultTypes.WHITEBOARD,
      category: SearchCategory.RESPONSES,
    },
  ],
});

const DEFAULT_MAX_RESULTS = 25;

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
    this.maxResults =
      this.configService.get('search.max_results', { infer: true }) ??
      DEFAULT_MAX_RESULTS;

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

    validateSearchParameters(searchData);

    const {
      terms: unfilteredTerms,
      types,
      categories,
      searchInSpaceFilter,
    } = searchData;
    const filteredTerms = validateSearchTerms(unfilteredTerms);
    const indicesToSearchOn = this.getIndices(onlyPublicResults, {
      types,
      categories,
    });

    return this.executeMultiSearch(
      indicesToSearchOn,
      filteredTerms,
      searchInSpaceFilter
    );
  }

  private getIndices(
    onlyPublicResults = false,
    filters?: {
      types?: SearchResultTypes[];
      categories?: SearchCategory[];
    }
  ): SearchIndex[] {
    const { categories, types } = filters ?? {};
    const indexStore = getIndexStore(this.indexPattern);

    const filteredIndicesByCategory = categories
      ? categories.flatMap(category => indexStore[category])
      : Object.values(indexStore).flat();

    const filteredIndicesByCategoryAndType = types
      ? filteredIndicesByCategory.filter(index =>
          types.some(type => type === index.type)
        )
      : filteredIndicesByCategory;

    if (onlyPublicResults) {
      const publicIndices = Object.values(
        getPublicIndexStore(this.indexPattern)
      ).flat();
      // todo: test does it work with the comparator
      // if we want only public results filter the public indices with the user defined filter
      return intersectionWith(
        filteredIndicesByCategoryAndType,
        publicIndices,
        (a, b) => a.name === b.name
      );
    }
    // these indices may include private data
    return filteredIndicesByCategory;
  }

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html
  /***
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
    searchInSpaceFilter?: string
  ) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    const term = terms.join(' ');
    // the main search query built using query DSL
    const query = buildSearchQuery(term, {
      spaceIdFilter: searchInSpaceFilter,
    });

    const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
      SearchCategory,
      SearchIndex[]
    >;

    const result = await this.client.msearch<IBaseAlkemio>({
      searches: Object.keys(indexByCategory).flatMap(category => {
        const indices = indexByCategory[category as SearchCategory].map(
          index => index.name
        );

        return [
          { index: indices } as MsearchMultisearchHeader,
          {
            query,
            // return only a small subset of fields to conserve data
            fields: ['id', 'type'],
            // do not include the source in the result
            _source: false,
            // offset, starting from 0
            from: 0,
            // max amount of results
            size: this.maxResults,
          } as MsearchMultisearchBody,
        ];
      }),
    });
    this.logger.verbose?.(
      `Searching in Elasticsearch took ${result.took}ms`,
      LogContext.SEARCH_EXTRACT
    );
    return result.responses.flatMap(
      (response: MsearchMultiSearchItem<IBaseAlkemio> | ErrorResponseBase) => {
        if (isElasticError(response)) {
          // todo: define the error, log it, put it in the right category
          throw new Error('Error response');
        }
        return response.hits.hits.map<ISearchResult>(hit => {
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
    );
  }
}
