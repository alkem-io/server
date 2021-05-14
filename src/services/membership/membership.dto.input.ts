import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MembershipInput {
  @Field(() => String, {
    nullable: false,
    description: 'The ID of the user to retrieve the membership of.',
  })
  userID!: string;
}
