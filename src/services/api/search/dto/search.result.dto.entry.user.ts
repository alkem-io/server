import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultUser', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultUser
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IUser, {
    nullable: false,
    description: 'The User that was found.',
  })
  user!: IUser;
}
