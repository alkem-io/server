import { Field, InputType } from '@nestjs/graphql';
import { MinLength } from 'class-validator';
@InputType()
export class CommunicationSendMessageUserInput {
  @Field(() => String, { nullable: false })
  senderCommunicationsID!: string;

  @Field(() => String, { nullable: false })
  receiverCommunicationsID!: string;

  @Field(() => String, { nullable: false })
  @MinLength(1)
  message!: string;
}
