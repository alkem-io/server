import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import {
  QueryDslFunctionScoreContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { SearchInput } from '@services/api/search';
import { validateSearchParameters } from '@services/api/search/util/validate.search.parameters';
import { validateSearchTerms } from '@services/api/search/util/validate.search.terms';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import {
  AlkemioErrorStatus,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { ConfigService } from '@nestjs/config';

enum SearchEntityTypes {
  USER = 'user',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  POST = 'post',
}

type SearchEntityTypesPublic = Exclude<
  SearchEntityTypes,
  SearchEntityTypes.USER | SearchEntityTypes.ORGANIZATION
>;

const TYPE_TO_INDEX = (
  indexPattern: string
): Record<SearchEntityTypes, string> => ({
  [SearchEntityTypes.SPACE]: `${indexPattern}spaces`,
  [SearchEntityTypes.CHALLENGE]: `${indexPattern}challenges`,
  [SearchEntityTypes.OPPORTUNITY]: `${indexPattern}opportunities`,
  [SearchEntityTypes.POST]: `${indexPattern}posts`,
  [SearchEntityTypes.USER]: `${indexPattern}users`,
  [SearchEntityTypes.ORGANIZATION]: `${indexPattern}organizations`,
});
const INDEX_TO_TYPE = (
  indexPattern: string
): Record<string, SearchEntityTypes> => ({
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.SPACE]]:
    SearchEntityTypes.SPACE,
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.CHALLENGE]]:
    SearchEntityTypes.CHALLENGE,
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.OPPORTUNITY]]:
    SearchEntityTypes.OPPORTUNITY,
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.POST]]: SearchEntityTypes.POST,
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.USER]]: SearchEntityTypes.USER,
  [TYPE_TO_INDEX(indexPattern)[SearchEntityTypes.ORGANIZATION]]:
    SearchEntityTypes.ORGANIZATION,
});
const TYPE_TO_PUBLIC_INDEX = (
  indexPattern: string
): Record<SearchEntityTypesPublic, string> => ({
  [SearchEntityTypes.SPACE]: `${indexPattern}spaces`,
  [SearchEntityTypes.CHALLENGE]: `${indexPattern}challenges`,
  [SearchEntityTypes.OPPORTUNITY]: `${indexPattern}opportunities`,
  [SearchEntityTypes.POST]: `${indexPattern}posts`,
});

const DEFAULT_MAX_RESULTS = 25;
const DEFAULT_INDEX_PATTERN = 'alkemio-data-';

@Injectable()
export class SearchExtractService {
  private readonly client: ElasticClient;
  private readonly indexPattern: string;
  private readonly maxResults: number;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    elasticClient: ElasticClient | undefined,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private configService: ConfigService
  ) {
    this.client = elasticClient!;

    const pattern =
      this.configService.get(ConfigurationTypes.SEARCH)?.index_pattern ??
      DEFAULT_INDEX_PATTERN;
    const prefix =
      this.configService.get(ConfigurationTypes.SEARCH)?.index_pattern_prefix ??
      '';

    this.indexPattern = `${prefix}${prefix ? '-' : ''}${pattern}`;
    this.maxResults =
      this.configService.get(ConfigurationTypes.SEARCH)?.max_results ??
      DEFAULT_MAX_RESULTS;
  }

  public async search(
    searchData: SearchInput,
    onlyPublicResults: boolean
  ): Promise<ISearchResult[] | never> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }
    validateSearchParameters(searchData);
    const filteredTerms = validateSearchTerms(searchData.terms);

    const terms = filteredTerms.join(' ');
    const indicesToSearchOn = this.getIndices(
      searchData.typesFilter,
      onlyPublicResults
    );

    const query: QueryDslQueryContainer = {
      bool: {
        must: [
          {
            multi_match: {
              query: terms,
              type: 'most_fields',
              fields: ['*'],
            },
          },
        ],
        filter: searchData.searchInSpaceFilter
          ? [{ match: { spaceID: searchData.searchInSpaceFilter } }]
          : undefined,
      },
    };
    // use with function_score to boost results based on visibility
    const functions: QueryDslFunctionScoreContainer[] = [
      {
        filter: {
          term: {
            'license.visibility': 'active',
          },
        },
        weight: 2,
      },
      {
        filter: {
          term: {
            'license.visibility': 'demo',
          },
        },
        weight: 1,
      },
      {
        filter: {
          term: {
            'license.visibility': 'archived',
          },
        },
        weight: 0,
      },
      {
        filter: {
          bool: {
            must_not: {
              exists: {
                field: 'license.visibility',
              },
            },
          },
        },
        weight: 1,
      },
    ];

    try {
      return await this.client
        .search<IBaseAlkemio>({
          index: indicesToSearchOn,
          // there will be a query building in the future to construct different queries
          // the current query is searching in everything, and boosting entities based on their visibility
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
          fields: ['id'],
          _source: false,
          from: 0,
          size: this.maxResults,
        })
        .then(result =>
          result.hits.hits.map<ISearchResult>(hit => {
            const entityId = hit.fields?.id?.[0];
            const type = INDEX_TO_TYPE(this.indexPattern)[hit._index];

            if (!entityId) {
              this.logger.error(
                `Search result with no entity id: ${JSON.stringify(hit)}`,
                undefined,
                LogContext.SEARCH
              );
            }

            return {
              id: hit._id,
              score: hit._score ?? -1,
              type,
              terms: [], // todo - https://github.com/alkem-io/server/issues/3702
              result: { id: entityId ?? 'N/A' },
            };
          })
        );
    } catch (e: any) {
      throw new BaseException(
        'Failed to search',
        LogContext.SEARCH,
        AlkemioErrorStatus.UNSPECIFIED,
        {
          message: e?.message,
          searchData,
        }
      );
    }
  }

  private getIndices(
    entityTypesFilter: string[] = [],
    onlyPublicResults: boolean
  ): string[] {
    if (onlyPublicResults) {
      return Object.values(TYPE_TO_PUBLIC_INDEX);
    } else if (!entityTypesFilter.length) {
      return [`${this.indexPattern}*`]; // return all
    } else {
      return Object.values(SearchEntityTypes).map(
        type => TYPE_TO_INDEX(this.indexPattern)[type]
      );
    }
  }
}
