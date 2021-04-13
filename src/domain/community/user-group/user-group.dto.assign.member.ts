import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupMemberInput {
  @Field({ nullable: false })
  groupID!: number;

  @Field({ nullable: false })
  userID!: number;
}
