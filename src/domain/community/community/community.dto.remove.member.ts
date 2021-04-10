import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityMemberInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
