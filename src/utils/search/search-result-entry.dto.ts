import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultEntry } from './search-result-entry.interface';
import { SearchResult } from './search-result.dto';

@ObjectType()
export class SearchResultEntry implements ISearchResultEntry {
  @Field(() => Number, {
    nullable: true,
    description:
      'The score for this search result; more matches means a higher score.',
  })
  score: number;

  @Field(() => [String], {
    nullable: true,
    description: 'The terms that were matched for this result',
  })
  terms: string[];

  @Field(() => SearchResult, {
    nullable: true,
    description:
      'Each search result contains either a User, UserGroup or Organisation',
  })
  result?: typeof SearchResult;

  constructor() {
    this.score = 0;
    this.terms = [];
  }
}
