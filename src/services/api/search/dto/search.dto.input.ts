import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SearchResultTypes } from '../search.result.types';
import { SearchCategory } from '@services/api/search/search.category';

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
      'Restrict the search to only the specified entity types. Default is all.',
  })
  types?: SearchResultTypes[];

  @Field(() => [SearchCategory], {
    nullable: true,
    description:
      'Restrict the search to only the specified categories. Default is all.',
  })
  categories?: SearchCategory[];

  @Field(() => UUID, {
    nullable: true,
    description:
      'Restrict the search to only the specified Space. Default is all Spaces.',
  })
  searchInSpaceFilter?: string;
}
