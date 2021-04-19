import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityMemberInput {
  @Field({ nullable: false })
  communityID!: number;

  @Field({ nullable: false })
  userID!: number;
}
