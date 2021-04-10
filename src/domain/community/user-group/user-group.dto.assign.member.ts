import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupMemberInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
