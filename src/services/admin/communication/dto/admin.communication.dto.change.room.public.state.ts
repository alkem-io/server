import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminChangeRoomPublicAccessInput {
  @Field(() => Boolean, { nullable: false })
  isPublic!: boolean;
}
