import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SearchFilterInput } from './search.filter.input';

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

  @Field(() => UUID, {
    nullable: true,
    description:
      'Restrict the search to only the specified Space. Default is all Spaces.',
  })
  searchInSpaceFilter?: string;

  @Field(() => [SearchFilterInput], {
    nullable: true,
    description: 'Return results that satisfy these conditions.',
  })
  filters?: SearchFilterInput[];
}
