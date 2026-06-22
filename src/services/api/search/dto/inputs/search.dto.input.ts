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

  @Field(() => UUID, {
    nullable: true,
    description:
      "Restrict the search to a single Collaboration's CalloutsSet, identified by its UUID. Default is all CalloutsSets.",
  })
  searchInCalloutsSetFilter?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Restrict the search to a single flow state within a CalloutsSet, identified by the InnovationFlowState UUID. Default is all flow states.',
  })
  searchInFlowStateFilter?: string;

  @Field(() => [SearchFilterInput], {
    nullable: true,
    description: 'Return results that satisfy these conditions.',
  })
  filters?: SearchFilterInput[];
}
