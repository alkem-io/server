import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignUserGroupFocalPointInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
