import { Field, ObjectType } from '@nestjs/graphql';
import { UUID, MessageID } from '@domain/common/scalars';
import { IMessage } from '@domain/communication/message/message.interface';

@ObjectType('ConversationMembership', {
  description: 'A membership record for a conversation participant.',
})
export class ConversationMembership {
  @Field(() => UUID, {
    nullable: false,
    description: 'The agent ID of the conversation member.',
  })
  agentId!: string;

  @Field(() => Date, {
    nullable: false,
    description: 'When this member joined the conversation.',
  })
  createdAt!: Date;
}

@ObjectType('ConversationCreatedEvent', {
  description:
    'Event fired when a new conversation is created (first message sent).',
})
export class ConversationCreatedEvent {
  @Field(() => UUID, { description: 'The conversation entity ID.' })
  id!: string;

  @Field(() => UUID, {
    description: 'The room ID associated with the conversation.',
  })
  roomId!: string;

  @Field(() => [ConversationMembership], {
    nullable: true,
    description: 'The members of the conversation.',
  })
  memberships?: ConversationMembership[];

  @Field(() => IMessage, {
    description: 'The first message in the conversation.',
  })
  message!: IMessage;
}

@ObjectType('MessageReceivedEvent', {
  description: 'Event fired when a new message is received in a conversation.',
})
export class MessageReceivedEvent {
  @Field(() => UUID, {
    description: 'The room ID where the message was received.',
  })
  roomId!: string;

  @Field(() => IMessage, { description: 'The message that was received.' })
  message!: IMessage;
}

@ObjectType('ReadReceiptUpdatedEvent', {
  description: 'Event fired when a read receipt is updated in a conversation.',
})
export class ReadReceiptUpdatedEvent {
  @Field(() => UUID, {
    description: 'The room ID where the read receipt was updated.',
  })
  roomId!: string;

  @Field(() => MessageID, {
    description: 'The ID of the last message that was read.',
  })
  lastReadMessageId!: string;
}

@ObjectType('ConversationEventSubscriptionResult', {
  description: 'Payload for conversation subscription events.',
})
export class ConversationEventSubscriptionResult {
  @Field(() => ConversationCreatedEvent, {
    nullable: true,
    description:
      'Present when a new conversation is created (first message sent).',
  })
  conversationCreated?: ConversationCreatedEvent;

  @Field(() => MessageReceivedEvent, {
    nullable: true,
    description:
      'Present when a new message is received in an existing conversation.',
  })
  messageReceived?: MessageReceivedEvent;

  @Field(() => ReadReceiptUpdatedEvent, {
    nullable: true,
    description: 'Present when a read receipt is updated.',
  })
  readReceiptUpdated?: ReadReceiptUpdatedEvent;
}
