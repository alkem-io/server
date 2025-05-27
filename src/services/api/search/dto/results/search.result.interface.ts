import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { LogContext } from '@common/enums/logging.context';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus } from '@common/enums';
import { SearchResultType } from '../../search.result.type';
import { ISearchResultSpace } from './search.result.space';
import { ISearchResultUser } from './search.result.user';
import { ISearchResultOrganization } from './search.result.organization';
import { ISearchResultPost } from './search.result.post';
import { ISearchResultCallout } from './search.result.callout';
import { BaseSearchHit } from '@services/api/search/dto/results/base.search.hit';

@InterfaceType('SearchResult', {
  resolveType(searchResult) {
    const type = searchResult.type;
    switch (type) {
      case SearchResultType.SPACE:
      case SearchResultType.SUBSPACE:
        return ISearchResultSpace;
      case SearchResultType.USER:
        return ISearchResultUser;
      case SearchResultType.ORGANIZATION:
        return ISearchResultOrganization;
      case SearchResultType.POST:
        return ISearchResultPost;
      case SearchResultType.CALLOUT:
        return ISearchResultCallout;
      case SearchResultType.WHITEBOARD:
        return ISearchResultCallout;
    }

    throw new BaseException(
      'Unable to determine search result for type',
      LogContext.SEARCH,
      AlkemioErrorStatus.NOT_SUPPORTED,
      { id: searchResult.id, type: searchResult.type }
    );
  },
})
export abstract class ISearchResult {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the search result. Does not represent the entity in Alkemio.',
  })
  id!: string;

  @Field(() => Number, {
    nullable: false,
    description:
      'The score for this search result; more matches means a higher score.',
  })
  score!: number;

  @Field(() => [String], {
    nullable: false,
    description: 'The terms that were matched for this result',
  })
  terms!: string[];

  @Field(() => SearchResultType, {
    nullable: false,
    description: 'The type of returned result for this search.',
  })
  type!: SearchResultType;
  // used to store the result object
  // to not be exposed by the API
  result!: BaseSearchHit;
}
