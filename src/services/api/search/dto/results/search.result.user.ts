import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { SearchResultBase } from './search.result.base';
import { ISearchResult } from './search.result.interface';

@ObjectType('SearchResultUser', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultUser extends SearchResultBase() {
  @Field(() => IUser, {
    nullable: false,
    description: 'The User that was found.',
  })
  user!: IUser;
}
