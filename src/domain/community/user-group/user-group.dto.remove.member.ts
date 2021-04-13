import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserGroupMemberInput {
  @Field({ nullable: false })
  groupID!: number;

  @Field({ nullable: false })
  userID!: number;
}
