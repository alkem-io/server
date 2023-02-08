import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SearchInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The terms to be searched for within this Hub. Max 5.',
  })
  terms!: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Expand the search to includes Tagsets with the provided names. Max 2.',
  })
  tagsetNames?: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Restrict the search to only the specified entity types. Values allowed: user, group, organization, Default is all.',
  })
  typesFilter?: string[];

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description:
      'Restrict the search to only the specified Hub. Default is all Hubs.',
  })
  searchInHubFilter?: string;
}
