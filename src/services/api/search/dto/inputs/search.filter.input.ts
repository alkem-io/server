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

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Count the Space and Subspace results the requester may see among the 1000 best ranked matches, and paginate over them exactly (see `total`); lower ranked matches are neither counted nor reachable. Only honoured for the SPACES category in a search that is not scoped to a Space. Costs a scan of up to 1000 matches, so only ask for it when the total is shown.',
    defaultValue: false,
  })
  countTotal?: boolean;
}
