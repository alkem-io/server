import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType()
export abstract class ISearchResults {
  @Field(() => [ISearchResult], {
    nullable: false,
    description: 'The search results for contributors (Users, Organizations).',
  })
  contributorResults!: ISearchResult[];

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of search results for contributors (Users, Organizations).',
  })
  contributorResultsCount!: number;

  @Field(() => [ISearchResult], {
    nullable: false,
    description:
      'The search results for contributions (Posts, Whiteboards etc).',
  })
  contributionResults!: ISearchResult[];

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of search results for contributions (Posts, Whiteboards etc).',
  })
  contributionResultsCount!: number;

  @Field(() => [ISearchResult], {
    nullable: false,
    description: 'The search results for Spaces / Challenges / Opportunities.',
  })
  journeyResults!: ISearchResult[];

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of results for Spaces / Challenges / Opportunities.',
  })
  journeyResultsCount!: number;

  @Field(() => [ISearchResult], {
    nullable: false,
    description: 'The search results for Callouts.',
  })
  calloutResults!: ISearchResult[];

  @Field(() => [ISearchResult], {
    nullable: false,
    description: 'The search results for Groups.',
  })
  groupResults!: ISearchResult[];
}
