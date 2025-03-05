import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType()
export abstract class ISearchCategoryResult {
  @Field(() => [ISearchResult], {
    nullable: false,
    description:
      'The ranked search results for this category, sorted by relevance',
  })
  results!: ISearchResult[];

  @Field(() => String, {
    nullable: true,
    description:
      'Provide this with your next search query to fetch the next set of results.',
  })
  cursor?: string;

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of search results for contributors (Users, Organizations).',
  })
  total!: number;
}
