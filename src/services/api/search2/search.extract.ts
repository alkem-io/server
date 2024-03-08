import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SearchInput } from '@services/api/search';
import { validateSearchParameters } from '@services/api/search/util/validate.search.parameters';
import { validateSearchTerms } from '@services/api/search/util/validate.search.terms';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

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

const indexPrefix = 'alkemio-data-';
const TYPE_TO_INDEX: Record<SearchEntityTypes, string> = {
  [SearchEntityTypes.SPACE]: `${indexPrefix}spaces`,
  [SearchEntityTypes.CHALLENGE]: `${indexPrefix}challenges`,
  [SearchEntityTypes.OPPORTUNITY]: `${indexPrefix}opportunities`,
  [SearchEntityTypes.POST]: `${indexPrefix}posts`,
  [SearchEntityTypes.USER]: `${indexPrefix}users`,
  [SearchEntityTypes.ORGANIZATION]: `${indexPrefix}organizations`,
};
const INDEX_TO_TYPE: Record<string, SearchEntityTypes> = {
  [TYPE_TO_INDEX[SearchEntityTypes.SPACE]]: SearchEntityTypes.SPACE,
  [TYPE_TO_INDEX[SearchEntityTypes.CHALLENGE]]: SearchEntityTypes.CHALLENGE,
  [TYPE_TO_INDEX[SearchEntityTypes.OPPORTUNITY]]: SearchEntityTypes.OPPORTUNITY,
  [TYPE_TO_INDEX[SearchEntityTypes.POST]]: SearchEntityTypes.POST,
  [TYPE_TO_INDEX[SearchEntityTypes.USER]]: SearchEntityTypes.USER,
  [TYPE_TO_INDEX[SearchEntityTypes.ORGANIZATION]]:
    SearchEntityTypes.ORGANIZATION,
};
const TYPE_TO_PUBLIC_INDEX: Record<SearchEntityTypesPublic, string> = {
  [SearchEntityTypes.SPACE]: `${indexPrefix}spaces`,
  [SearchEntityTypes.CHALLENGE]: `${indexPrefix}challenges`,
  [SearchEntityTypes.OPPORTUNITY]: `${indexPrefix}opportunities`,
  [SearchEntityTypes.POST]: `${indexPrefix}posts`,
};

@Injectable()
export class SearchExtractService {
  private readonly client: ElasticClient;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly elasticClient: ElasticClient | undefined,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.client = elasticClient!;
  }

  public async search(
    searchData: SearchInput,
    onlyPublicResults: boolean
  ): Promise<ISearchResult[]> {
    validateSearchParameters(searchData);
    const filteredTerms = validateSearchTerms(searchData.terms);
    // todo: if space filter is specified - do not return users & orgs
    // you can get them, but then filter them out on the server
    // involves working with credentials
    const terms = filteredTerms.join(' ');
    const indicesToSearchOn = this.getIndices(
      searchData.typesFilter,
      onlyPublicResults
    );

    const result = await this.client.search<IBaseAlkemio>({
      index: indicesToSearchOn,
      query: {
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
            ? [{ match: { spaceId: searchData.searchInSpaceFilter } }]
            : undefined,
        },
      },
      fields: ['id'],
      _source: false,
      from: 0,
      size: 50,
    });

    return result.hits.hits.map<ISearchResult>(hit => {
      const entityId = hit.fields?.id?.[0];
      const type = INDEX_TO_TYPE[hit._index];

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
        terms: [], // todo
        result: { id: entityId ?? 'N/A' },
      };
    });
  }

  private getIndices(
    entityTypesFilter: string[] = [],
    onlyPublicResults: boolean
  ): string[] {
    if (onlyPublicResults) {
      return Object.values(TYPE_TO_PUBLIC_INDEX);
    } else if (!entityTypesFilter.length) {
      return [`${indexPrefix}*`]; // return all
    } else {
      return Object.values(SearchEntityTypes).map(type => TYPE_TO_INDEX[type]);
    }
  }
}
