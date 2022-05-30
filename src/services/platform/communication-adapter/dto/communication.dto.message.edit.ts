import { Field, InputType } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
@InputType()
export class CommunicationEditMessageInput {
  @Field(() => String, { nullable: false })
  senderCommunicationsID!: string;

  @Field(() => String, { nullable: false })
  @MinLength(1)
  message!: string;

  @Field(() => String, { nullable: false })
  messageId!: string;

  @Field(() => String, { nullable: false })
  roomID!: string;
}
