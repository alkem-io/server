import { intersection } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { ISearchResult, SearchInput } from '../dto';
import { validateSearchTerms, validateSearchParameters } from '../util';
import { functionScoreFunctions } from './function.score.functions';
import { buildSearchQuery } from './build.search.query';
import { SearchEntityTypes } from '../search.entity.types';
import { AlkemioConfig } from '@src/types';
import { getIndexPattern } from '@services/api/search/ingest/get.index.pattern';

type SearchEntityTypesPublic =
  | SearchEntityTypes.SPACE
  | SearchEntityTypes.SUBSPACE
  | SearchEntityTypes.POST;

const TYPE_TO_INDEX = (
  indexPattern: string
): Record<SearchEntityTypes, string> => ({
  [SearchEntityTypes.SPACE]: `${indexPattern}spaces`,
  [SearchEntityTypes.SUBSPACE]: `${indexPattern}subspaces`,
  [SearchEntityTypes.POST]: `${indexPattern}posts`,
  [SearchEntityTypes.USER]: `${indexPattern}users`,
  [SearchEntityTypes.ORGANIZATION]: `${indexPattern}organizations`,
  [SearchEntityTypes.CALLOUT]: `${indexPattern}callouts`,
  [SearchEntityTypes.GROUP]: '',
  [SearchEntityTypes.WHITEBOARD]: `${indexPattern}whiteboards`,
});
const TYPE_TO_PUBLIC_INDEX = (
  indexPattern: string
): Record<SearchEntityTypesPublic, string> => ({
  [SearchEntityTypes.SPACE]: `${indexPattern}spaces`,
  [SearchEntityTypes.SUBSPACE]: `${indexPattern}subspaces`,
  [SearchEntityTypes.POST]: `${indexPattern}posts`,
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
    excludeDemoSpaces: boolean
  ): Promise<ISearchResult[] | never> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    validateSearchParameters(searchData);
    const filteredTerms = validateSearchTerms(searchData.terms);

    const terms = filteredTerms.join(' ');
    const indicesToSearchOn = this.getIndices(
      searchData.typesFilter,
      excludeDemoSpaces
    );
    // the main search query built using query DSL
    const query = buildSearchQuery(terms, {
      spaceIdFilter: searchData.searchInSpaceFilter,
      excludeDemoSpaces,
    });
    // used with function_score to boost results based on visibility
    const functions = functionScoreFunctions;

    try {
      return await this.client
        .search<IBaseAlkemio>({
          // indices to search on
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
          // return only the 'id' and 'type' fields of the document
          fields: ['id', 'type'],
          // do not include the source in the result
          _source: false,
          // offset, starting from 0
          from: 0,
          // max amount of results
          size: this.maxResults,
        })
        .then(result =>
          result.hits.hits.map<ISearchResult>(hit => {
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
          })
        );
    } catch (e: any) {
      throw new BaseException(
        'Failed to search',
        LogContext.SEARCH_EXTRACT,
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
    const filteredIndices = entityTypesFilter.map(
      type => TYPE_TO_INDEX(this.indexPattern)[type as SearchEntityTypes]
    );
    // todo: remove this when whiteboard is a separate search result
    // include the whiteboards, if the callout is included
    if (entityTypesFilter.includes(SearchEntityTypes.CALLOUT)) {
      filteredIndices.push(
        TYPE_TO_INDEX(this.indexPattern)[SearchEntityTypes.WHITEBOARD]
      );
    }

    if (onlyPublicResults) {
      const publicIndices = Object.values(
        TYPE_TO_PUBLIC_INDEX(this.indexPattern)
      );
      return intersection(filteredIndices, publicIndices);
    }

    if (!entityTypesFilter.length) {
      return [`${this.indexPattern}*`]; // return all
    }

    return filteredIndices;
  }
}
