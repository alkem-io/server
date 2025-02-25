import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IndexCategory } from '../extract/search.extract.service';
import { SearchResultTypes } from '@services/api/search/search.entity.types';

@InputType()
export class SearchInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The terms to be searched for within this Space. Max 5.',
  })
  terms!: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Expand the search to includes Tagsets with the provided names. Max 2.',
  })
  tagsetNames?: string[];

  @Field(() => [SearchResultTypes], {
    nullable: true,
    description:
      'Restrict the search to only the specified entity types. Values allowed: space, subspace, user, organization, callout, post, whiteboard. Default is all.',
  })
  typesFilter?: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Restrict the search to only the specified categories. Allowed values: spaces, collaboration-tools, responses, contributors. Default is all.',
  })
  categories?: IndexCategory[];

  @Field(() => UUID, {
    nullable: true,
    description:
      'Restrict the search to only the specified Space. Default is all Spaces.',
  })
  searchInSpaceFilter?: string;
}
