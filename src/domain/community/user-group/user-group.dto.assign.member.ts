import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupMemberInput {
  @Field({ nullable: false })
  parentID!: number;

  @Field({ nullable: false })
  childID!: number;
}
