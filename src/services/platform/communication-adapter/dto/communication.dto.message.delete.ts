import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class CommunicationDeleteMessageInput {
  @Field(() => String, { nullable: false })
  senderCommunicationsID!: string;

  @Field(() => String, { nullable: false })
  messageId!: string;

  @Field(() => String, { nullable: false })
  roomID!: string;
}
