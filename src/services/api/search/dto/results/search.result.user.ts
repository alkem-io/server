import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

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
