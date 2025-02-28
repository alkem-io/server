import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.entry.interface';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultCallout } from '@services/api/search/dto/search.result.dto.entry.callout';

@ObjectType()
export abstract class ISearchResults {
  @Field(() => [ISearchResult], {
    nullable: false,
    description: 'The search results for contributors (Users, Organizations).',
  })
  contributorResults!: ISearchResult[];

  @Field(() => String, {
    nullable: true,
    description:
      'Provide this with your next search request to fetch the next set of contributor search results.',
  })
  contributorCursor?: string;

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of search results for contributors (Users, Organizations).',
  })
  contributorResultsCount!: number;
  // -----------------------------------------------------------------------------
  @Field(() => [ISearchResult], {
    nullable: false,
    description:
      'The search results for contributions (Posts, Whiteboards etc).',
  })
  contributionResults!: ISearchResult[];

  @Field(() => String, {
    nullable: true,
    description:
      'Provide this with your next search request to fetch the next set of contribution search results.',
  })
  contributionCursor?: string;

  @Field(() => Number, {
    nullable: false,
    description:
      'The total number of search results for contributions (Posts, Whiteboards etc).',
  })
  contributionResultsCount!: number;
  // -----------------------------------------------------------------------------
  @Field(() => [ISearchResultSpace], {
    nullable: false,
    description: 'The search results for Spaces / Subspaces.',
  })
  spaceResults!: ISearchResultSpace[];

  @Field(() => String, {
    nullable: true,
    description:
      'Provide this with your next search request to fetch the next set of space search results.',
  })
  spaceCursor?: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The total number of results for Spaces / Subspaces.',
  })
  spaceResultsCount!: number;
  // -----------------------------------------------------------------------------
  @Field(() => [ISearchResultCallout], {
    nullable: false,
    description: 'The search results for Callouts.',
  })
  calloutResults!: ISearchResultCallout[];

  @Field(() => String, {
    nullable: true,
    description:
      'Provide this with your next search request to fetch the next set of callout search results.',
  })
  calloutCursor?: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The total number of results for Callouts.',
  })
  calloutResultsCount!: number;
}
