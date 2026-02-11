import { MessageID, UUID } from '@domain/common/scalars';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IMessage } from '../message/message.interface';

@ObjectType('RoomWithReadState')
export class IRoomWithReadState {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the room',
  })
  displayName!: string;

  @Field(() => [IMessage], {
    nullable: false,
    description: 'The messages that have been sent to the Room.',
  })
  messages!: IMessage[];

  @Field(() => Int, {
    nullable: false,
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  // The communication IDs of the room members (internal, not exposed in GraphQL)
  members?: string[];

  @Field(() => MessageID, {
    nullable: true,
    description: 'The ID of the last message read by the current user.',
  })
  lastReadEventId?: string;

  @Field(() => Int, {
    nullable: false,
    description: 'The number of unread messages for the current user.',
  })
  unreadCount!: number;
}
