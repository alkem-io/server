import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityMemberInput {
  @Field({ nullable: false })
  communityID!: number;

  @Field({ nullable: false })
  userID!: number;
}
