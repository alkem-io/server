import { IMessage } from '@domain/communication/message/message.interface';
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

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: IMessage;
}
