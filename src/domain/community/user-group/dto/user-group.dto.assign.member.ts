import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupMemberInput {
  @Field(() => UUID, { nullable: false })
  groupID!: string;

  @Field(() => UUID, { nullable: false })
  userID!: string;
}
