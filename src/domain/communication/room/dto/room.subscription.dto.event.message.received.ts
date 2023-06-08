import { IMessage } from '@domain/communication/message/message.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('RoomMessageReceived')
export class RoomMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Room on which the message was sent.',
  })
  roomID!: string;

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: IMessage;
}
