import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SearchInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The terms to be searched for within this Ecoverse. Max 5.',
  })
  terms!: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'The names of tagsets to also be searched. Max 2.',
  })
  tagsetNames?: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'The entity types that are requrested to be returned. Values allowed: User, UserGroup. Default is both.',
  })
  entityTypes?: string[];

  @Field(() => [Number], {
    nullable: true,
    description:
      'The IDs of the challenges to restrict the search to. Default is all Challenges.',
  })
  challengesFilter?: number[];
}
