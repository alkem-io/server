import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultUserGroup', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultUserGroup
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IUserGroup, {
    nullable: false,
    description: 'The User Group that was found.',
  })
  userGroup!: IUserGroup;
}
