import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SearchResultType } from '../search.result.type';
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

  @Field(() => [SearchResultType], {
    nullable: true,
    description:
      'Restrict the search to only the specified entity types. Default is all.',
  })
  types?: SearchResultType[];

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

  @Field(() => String, {
    nullable: true,
    description:
      'The cursor after which we want results (offset) - pass this from your previous search to request additional results. Useful for paginating results.',
  })
  cursor?: string;

  @Field(() => Number, {
    nullable: true,
    description:
      'How many results per category to return. Useful for paginating results.',
    defaultValue: 4,
  })
  size!: number;
}
