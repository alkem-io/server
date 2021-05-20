import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupMemberInput {
  @Field({ nullable: false })
  groupID!: string;

  @Field({ nullable: false })
  userID!: string;
}
