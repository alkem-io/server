import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserGroupMemberInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
