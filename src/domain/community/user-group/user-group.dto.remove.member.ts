import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserGroupMemberInput {
  @Field({ nullable: false })
  groupID!: string;

  @Field({ nullable: false })
  userID!: string;
}
