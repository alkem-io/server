import { IMessage } from '@domain/communication/message/message.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationDiscussionMessageReceived')
export class CommunicationDiscussionMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Discussion on which the message was sent.',
  })
  discussionID!: string;

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: IMessage;
}
