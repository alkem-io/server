import { Inject, Injectable } from '@nestjs/common';
import { SearchInput } from '@services/api/search';
import { validateSearchParameters } from '@services/api/search/util/validate.search.parameters';
import { validateSearchTerms } from '@services/api/search/util/validate.search.terms';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

enum SearchEntityTypes {
  USER = 'user',
  GROUP = 'group',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  POST = 'post',
}

const indexPrefix = 'alkemio-data-';
const TYPE_TO_INDEX: Record<SearchEntityTypes, string> = {
  [SearchEntityTypes.SPACE]: `${indexPrefix}spaces`,
  [SearchEntityTypes.CHALLENGE]: `${indexPrefix}challenges`,
  [SearchEntityTypes.OPPORTUNITY]: `${indexPrefix}opportunities`,
  [SearchEntityTypes.POST]: `${indexPrefix}posts`,
  [SearchEntityTypes.USER]: `${indexPrefix}users`,
  [SearchEntityTypes.GROUP]: `${indexPrefix}groups`,
  [SearchEntityTypes.ORGANIZATION]: `${indexPrefix}organizations`,
};

const INDEX_TO_TYPE: Record<string, SearchEntityTypes> = {
  [TYPE_TO_INDEX[SearchEntityTypes.SPACE]]: SearchEntityTypes.SPACE,
  [TYPE_TO_INDEX[SearchEntityTypes.CHALLENGE]]: SearchEntityTypes.CHALLENGE,
  [TYPE_TO_INDEX[SearchEntityTypes.OPPORTUNITY]]: SearchEntityTypes.OPPORTUNITY,
  [TYPE_TO_INDEX[SearchEntityTypes.POST]]: SearchEntityTypes.POST,
  [TYPE_TO_INDEX[SearchEntityTypes.USER]]: SearchEntityTypes.USER,
  [TYPE_TO_INDEX[SearchEntityTypes.GROUP]]: SearchEntityTypes.GROUP,
  [TYPE_TO_INDEX[SearchEntityTypes.ORGANIZATION]]:
    SearchEntityTypes.ORGANIZATION,
};

@Injectable()
export class SearchExtractService {
  private readonly client: ElasticClient;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly elasticClient: ElasticClient | undefined
  ) {
    this.client = elasticClient!;
  }

  public async search(searchData: SearchInput): Promise<ISearchResult[]> {
    validateSearchParameters(searchData);
    const filteredTerms = validateSearchTerms(searchData.terms);

    // todo: if space filter is specified - do not return users & orgs
    // you can get them, but then filter them out on the server
    // involves working with credentials

    // throw new Error('Method not implemented.');
    const terms = filteredTerms.join(' ');
    const indicesToSearchOn = this.getIndices(searchData.typesFilter);

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
    });

    return result.hits.hits.map<ISearchResult>(hit => ({
      id: `${INDEX_TO_TYPE[hit._index]}-${hit._id}`,
      score: hit._score ?? -1,
      type: INDEX_TO_TYPE[hit._index],
      terms: [], // todo
      result: { id: hit._id },
    }));
  }

  private getIndices(entityTypesFilter: string[] = []) {
    if (entityTypesFilter.length === 0) {
      return [`${indexPrefix}*`]; // return all
    }
    const indices: string[] = [];
    Object.values(SearchEntityTypes).forEach(type => {
      if (entityTypesFilter.includes(type)) {
        indices.push(TYPE_TO_INDEX[type]);
      }
    });

    return indices;
  }
}
