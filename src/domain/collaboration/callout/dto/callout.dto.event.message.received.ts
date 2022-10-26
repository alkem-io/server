import { IMessage } from '@domain/communication/message/message.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutMessageReceived')
export class CalloutMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Callout.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Comments.',
  })
  commentsID!: string;

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: IMessage;
}
