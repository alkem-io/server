import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AspectCommentsMessageReceived')
export class AspectCommentsMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Aspect.',
  })
  aspectID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Comments on which the message was sent.',
  })
  commentsID!: string;

  @Field(() => CommunicationMessageResult, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: CommunicationMessageResult;
}
