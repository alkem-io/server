import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultSpace } from './search.result.dto.entry.space';
import { ISearchResultUser } from './search.result.dto.entry.user';
import { ISearchResultOrganization } from './search.result.dto.entry.organization';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ISearchResultPost } from './search.result.dto.entry.post';
import { ISearchResultUserGroup } from './search.result.dto.entry.user.group';
import { ISearchResultCallout } from './search.result.dto.entry.callout';

@InterfaceType('SearchResult', {
  resolveType(searchResult) {
    const type = searchResult.type;
    switch (type) {
      case SearchResultType.SPACE:
      case SearchResultType.CHALLENGE:
      case SearchResultType.OPPORTUNITY:
        return ISearchResultSpace;
      case SearchResultType.USER:
        return ISearchResultUser;
      case SearchResultType.ORGANIZATION:
        return ISearchResultOrganization;
      case SearchResultType.POST:
        return ISearchResultPost;
      case SearchResultType.USERGROUP:
        return ISearchResultUserGroup;
      case SearchResultType.CALLOUT:
        return ISearchResultCallout;
      case SearchResultType.WHITEBOARD:
        return ISearchResultCallout;
    }

    throw new RelationshipNotFoundException(
      `Unable to determine search result type for ${searchResult.id}: ${type}`,
      LogContext.SEARCH
    );
  },
})
export abstract class ISearchResult {
  @Field(() => UUID, {
    nullable: false,
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
  type!: string;

  // The actual result
  result!: IBaseAlkemio;
}
