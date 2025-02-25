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
import { functionScoreFunctions } from './function.score.functions';
import { buildSearchQuery } from './build.search.query';
import { SearchResultTypes } from '../search.entity.types';
import { AlkemioConfig } from '@src/types';
import { getIndexPattern } from '@services/api/search/ingest/get.index.pattern';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchMultiSearchItem,
} from '@elastic/elasticsearch/lib/api/types';

// todo: maybe not the perfect name
export enum IndexCategory {
  SPACES = 'spaces',
  COLLABORATION_TOOLS = 'collaboration-tools',
  RESPONSES = 'responses',
  CONTRIBUTORS = 'contributors',
}

type Index = {
  name: string;
  type: SearchResultTypes;
  category: IndexCategory;
};
// todo: rename
const getIndexStore = (
  indexPattern: string
): Record<IndexCategory, Index[]> => ({
  [IndexCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultTypes.SPACE,
      category: IndexCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultTypes.SUBSPACE,
      category: IndexCategory.SPACES,
    },
  ],
  [IndexCategory.CONTRIBUTORS]: [
    {
      name: `${indexPattern}users`,
      type: SearchResultTypes.USER,
      category: IndexCategory.CONTRIBUTORS,
    },
    {
      name: `${indexPattern}organizations`,
      type: SearchResultTypes.ORGANIZATION,
      category: IndexCategory.CONTRIBUTORS,
    },
  ],
  [IndexCategory.COLLABORATION_TOOLS]: [
    {
      name: `${indexPattern}callouts`,
      type: SearchResultTypes.CALLOUT,
      category: IndexCategory.COLLABORATION_TOOLS,
    },
  ],
  [IndexCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultTypes.POST,
      category: IndexCategory.RESPONSES,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultTypes.WHITEBOARD,
      category: IndexCategory.RESPONSES,
    },
  ],
});
const getPublicIndexStore = (
  indexPattern: string
): Partial<Record<IndexCategory, Index[]>> => ({
  [IndexCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultTypes.SPACE,
      category: IndexCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultTypes.SUBSPACE,
      category: IndexCategory.SPACES,
    },
  ],
  [IndexCategory.RESPONSES]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultTypes.POST,
      category: IndexCategory.RESPONSES,
    },
    // todo: check if whiteboards should be added to the public results
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultTypes.WHITEBOARD,
      category: IndexCategory.RESPONSES,
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
    const filteredTerms = validateSearchTerms(searchData.terms);

    const terms = filteredTerms.join(' ');
    const indicesToSearchOn = this.getIndices(
      searchData.categories,
      onlyPublicResults
    );
    const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
      IndexCategory,
      Index[]
    >;
    // the main search query built using query DSL
    const query = buildSearchQuery(terms, {
      spaceIdFilter: searchData.searchInSpaceFilter,
    });
    // used with function_score to boost results
    const functions = functionScoreFunctions;

    const results = await this.client.msearch<IBaseAlkemio>({
      searches: [
        {
          index: indexByCategory.spaces.map(({ name }) => name),
        } as MsearchMultisearchHeader,
        {
          query: {
            /**
             * The function_score allows you to modify the score of documents that are retrieved by a query.
             * This can be useful if, for example, a score function is computationally expensive and
             * it is sufficient to compute the score on a filtered set of documents.
             **/
            function_score: {
              query,
              functions,
              /** how each of the assigned weights are combined */
              score_mode: 'sum', // the filters are mutually exclusive, so only one filter will be applied at a time
              /** how the combined weights are combined with the score */
              boost_mode: 'multiply',
            },
          },
          // return only a small subset of fields to conserve data
          fields: ['id', 'type'],
          // do not include the source in the result
          _source: false,
          // offset, starting from 0
          from: 0,
          // max amount of results
          size: this.maxResults,
        } as MsearchMultisearchBody,
      ],
    });
    this.logger.verbose?.(
      `Searching in Elasticsearch took ${results.took}ms`,
      LogContext.SEARCH_EXTRACT
    );
    return (
      results.responses[0] as MsearchMultiSearchItem
    ).hits.hits.map<ISearchResult>(hit => {
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

    // try {
    //   return await this.client
    //     .search<IBaseAlkemio>({
    //       // indices to search on
    //       index: '',
    //       // there will be a query building in the future to construct different queries
    //       // the current query is searching in everything, and boosting entities based on their visibility
    //       query: {
    //         /**
    //          * The function_score allows you to modify the score of documents that are retrieved by a query.
    //          * This can be useful if, for example, a score function is computationally expensive and
    //          * it is sufficient to compute the score on a filtered set of documents.
    //          **/
    //         function_score: {
    //           query,
    //           functions,
    //           /** how each of the assigned weights are combined */
    //           score_mode: 'sum', // the filters are mutually exclusive, so only one filter will be applied at a time
    //           /** how the combined weights are combined with the score */
    //           boost_mode: 'multiply',
    //         },
    //       },
    //       // return only a small subset of fields to conserve data
    //       fields: ['id', 'type'],
    //       // do not include the source in the result
    //       _source: false,
    //       // offset, starting from 0
    //       from: 0,
    //       // max amount of results
    //       size: this.maxResults,
    //     })
    //     .then(result =>
    //       result.hits.hits.map<ISearchResult>(hit => {
    //         const entityId = hit.fields?.id?.[0];
    //         const type = hit.fields?.type?.[0];
    //
    //         if (!entityId) {
    //           this.logger.error(
    //             `Search result with no entity id: ${JSON.stringify(hit)}`,
    //             undefined,
    //             LogContext.SEARCH_EXTRACT
    //           );
    //         }
    //
    //         if (hit._ignored) {
    //           const ignored = hit._ignored.join('; ');
    //           this.logger.warn(
    //             `Some fields were ignored while searching: ${ignored}`,
    //             undefined,
    //             LogContext.SEARCH_EXTRACT
    //           );
    //         }
    //
    //         return {
    //           id: hit._id ?? 'N/A',
    //           score: hit._score ?? -1,
    //           type,
    //           terms: [], // todo - https://github.com/alkem-io/server/issues/3702
    //           result: { id: entityId ?? 'N/A' },
    //         };
    //       })
    //     );
    // } catch (e: any) {
    //   throw new BaseException(
    //     'Failed to search',
    //     LogContext.SEARCH_EXTRACT,
    //     AlkemioErrorStatus.UNSPECIFIED,
    //     {
    //       message: e?.message,
    //       searchData,
    //     }
    //   );
    // }
  }

  private getIndices(
    categoryFilter: IndexCategory[] = [],
    onlyPublicResults: boolean
  ): Index[] {
    const indexStore = getIndexStore(this.indexPattern);
    const filteredIndices = categoryFilter.flatMap(
      category => indexStore[category]
    );

    if (onlyPublicResults) {
      const publicIndices = Object.values(
        getPublicIndexStore(this.indexPattern)
      ).flat();
      // todo: test does it work with the comparator
      // if we want only public results filter the public indices with the user defined filter
      return intersectionWith(
        filteredIndices,
        publicIndices,
        (a, b) => a.name === b.name
      );
    }

    if (!categoryFilter.length) {
      return Object.values(indexStore).flat(); // return all
    }

    return filteredIndices;
  }
}
