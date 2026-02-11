import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchCategoryResult } from './search.category.result';

@ObjectType()
export abstract class ISearchResults {
  @Field(() => ISearchCategoryResult, {
    nullable: false,
    description: 'The search results for contributors (Users, Organizations).',
  })
  contributorResults!: ISearchCategoryResult;

  @Field(() => ISearchCategoryResult, {
    nullable: false,
    description:
      'The search results for contributions (Posts, Whiteboards, Memos).',
  })
  contributionResults!: ISearchCategoryResult;

  @Field(() => ISearchCategoryResult, {
    nullable: false,
    description:
      'The search results callout framings (Whiteboards, Memos as additional content).',
  })
  framingResults!: ISearchCategoryResult;

  @Field(() => ISearchCategoryResult, {
    nullable: false,
    description: 'The search results for Spaces / Subspaces.',
  })
  spaceResults!: ISearchCategoryResult;

  @Field(() => ISearchCategoryResult, {
    nullable: false,
    description: 'The search results for Callouts.',
  })
  calloutResults!: ISearchCategoryResult;
}
