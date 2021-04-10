import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserGroupFocalPoint {
  @Field()
  groupID!: number;
}
