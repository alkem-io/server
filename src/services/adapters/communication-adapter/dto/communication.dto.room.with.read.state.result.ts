import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MessageID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';

@ObjectType('MessageWithReadState', {
  description: 'A message with read state information for the current user',
})
export class MessageWithReadState {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the message event.',
  })
  id!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  sender!: string;

  senderType!: 'user' | 'virtualContributor' | 'unknown';

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => [IMessageReaction], {
    nullable: false,
    description: 'Reactions on this message',
  })
  reactions!: IMessageReaction[];

  @Field(() => String, {
    nullable: true,
    description: 'The message being replied to',
  })
  threadID?: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether this message has been read by the current user.',
  })
  isRead!: boolean;
}

@ObjectType('CommunicationRoomWithReadState')
export class CommunicationRoomWithReadStateResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => [MessageWithReadState], {
    nullable: false,
    description:
      'The messages that have been sent to the Room, with read state.',
  })
  messages!: MessageWithReadState[];

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the room',
  })
  displayName!: string;

  // The communication IDs of the room members
  members!: string[];

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
