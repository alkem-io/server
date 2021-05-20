import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityMemberInput {
  @Field({ nullable: false })
  communityID!: string;

  @Field({ nullable: false })
  userID!: string;
}
