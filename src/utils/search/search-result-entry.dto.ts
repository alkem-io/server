import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultEntry } from './search-result-entry.interface';
import { SearchResult } from './search-result.dto';

@ObjectType()
export class SearchResultEntry implements ISearchResultEntry {
  @Field(() => Number)
  score: number;

  @Field(() => SearchResult, {
    nullable: true,
    description: 'Each search result contains either a User or UserGroup',
  })
  result?: typeof SearchResult;

  constructor() {
    this.score = 0;
  }
}
