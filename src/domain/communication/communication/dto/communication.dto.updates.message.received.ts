import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationUpdateMessageReceived')
export class CommunicationUpdateMessageReceived {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Updates on which the message was sent.',
  })
  updatesID!: string;

  @Field(() => CommunicationMessageResult, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: CommunicationMessageResult;
}
