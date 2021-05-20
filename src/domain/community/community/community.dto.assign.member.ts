import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityMemberInput {
  @Field({ nullable: false })
  communityID!: string;

  @Field({ nullable: false })
  userID!: string;
}
