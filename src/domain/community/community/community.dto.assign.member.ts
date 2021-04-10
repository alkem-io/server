import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityMemberInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
