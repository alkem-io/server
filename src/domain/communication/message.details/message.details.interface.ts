import { Field, ObjectType } from '@nestjs/graphql';
import { MessageParent } from './message.details.parent.interface';
import { IRoom } from '../room/room.interface';

@ObjectType('MessageDetails', {
  description:
    'Details about a message, including the room it was sent in and the parent entity that is using the room.',
})
export abstract class MessageDetails {
  roomID!: string;
  messageID!: string;
  // The following get populated before passing to the GraphQL layer
  parent!: MessageParent;

  @Field(() => String, {
    nullable: false,
    description: 'The message that was sent.',
  })
  message!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The Room in which the message that was sent.',
  })
  room!: IRoom;
}
