import { SearchCursor } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SearchCategory } from '../../search.category';
import { SearchResultType } from '../../search.result.type';

@InputType()
export class SearchFilterInput {
  @Field(() => SearchCategory, {
    nullable: false,
    description: 'Include this category in the search results.',
  })
  category!: SearchCategory;

  @Field(() => SearchCursor, {
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

  @Field(() => [SearchResultType], {
    nullable: true,
    description: 'Which types to include. Defaults to all in the category.',
  })
  types?: SearchResultType[];
}
