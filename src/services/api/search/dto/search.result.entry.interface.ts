import { Field, InterfaceType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultOpportunity } from './search.result.dto.entry.opportunity';
import { ISearchResultHub } from './search.result.dto.entry.hub';
import { ISearchResultChallenge } from './search.result.dto.entry.challenge';
import { ISearchResultUser } from './search.result.dto.entry.user';
import { ISearchResultOrganization } from './search.result.dto.entry.organization';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ISearchResultPost } from './search.result.dto.entry.post';
import { ISearchResultUserGroup } from './search.result.dto.entry.user.group';

@InterfaceType('SearchResult', {
  resolveType(searchResult) {
    const type = searchResult.type;
    switch (type) {
      case SearchResultType.HUB:
        return ISearchResultHub;
      case SearchResultType.CHALLENGE:
        return ISearchResultChallenge;
      case SearchResultType.OPPORTUNITY:
        return ISearchResultOpportunity;
      case SearchResultType.USER:
        return ISearchResultUser;
      case SearchResultType.ORGANIZATION:
        return ISearchResultOrganization;
      case SearchResultType.CARD:
        return ISearchResultPost;
      case SearchResultType.USERGROUP:
        return ISearchResultUserGroup;
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
    description: 'The event type for this Activity.',
  })
  type!: string;

  // The actual result
  result!: IBaseAlkemio;
}
