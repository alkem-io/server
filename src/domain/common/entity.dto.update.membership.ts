import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateMembershipInput {
  @Field()
  parentID!: number;

  @Field()
  childID!: number;
}
