import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminUpdateRoomsJoinRuleInput {
  @Field(() => Boolean, { nullable: false })
  isPublic!: boolean;
}
