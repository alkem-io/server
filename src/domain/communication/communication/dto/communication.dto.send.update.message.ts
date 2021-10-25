import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationSendUpdateMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The communication the message is being sent to',
  })
  communicationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;
}
