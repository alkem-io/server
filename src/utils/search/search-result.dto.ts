import { Field, ObjectType } from '@nestjs/graphql';
import { UserGroup } from '../../domain/user-group/user-group.entity';
import { User } from '../../domain/user/user.entity';
import { ISearchResult } from './search-result.interface';

@ObjectType()
export class SearchResult implements ISearchResult {
  @Field(() => Number)
  score: number;

  @Field(() => User, {
    nullable: true,
    description: 'Each search result contains either a User or UserGroup',
  })
  user?: User;

  @Field(() => UserGroup, {
    nullable: true,
    description: 'Each search result contains either a User or UserGroup',
  })
  group?: UserGroup;

  constructor() {
    this.score = 0;
  }
}
