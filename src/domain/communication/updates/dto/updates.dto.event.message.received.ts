import { IMessage } from '@domain/communication/message/message.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationUpdateMessageReceived')
export class CommunicationUpdateMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Updates on which the message was sent.',
  })
  updatesID!: string;

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: IMessage;
}
