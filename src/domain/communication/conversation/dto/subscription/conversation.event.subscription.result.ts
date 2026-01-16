import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UUID, MessageID } from '@domain/common/scalars';
import { IMessage } from '@domain/communication/message/message.interface';
import { IConversation } from '@domain/communication/conversation/conversation.interface';

/**
 * Discriminator enum for conversation events.
 * Enables easier client-side consumption without branching on nullable fields.
 */
export enum ConversationEventType {
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_REMOVED = 'MESSAGE_REMOVED',
  READ_RECEIPT_UPDATED = 'READ_RECEIPT_UPDATED',
}

registerEnumType(ConversationEventType, {
  name: 'ConversationEventType',
  description: 'The type of conversation event.',
});

@ObjectType('ConversationCreatedEvent', {
  description:
    'Event fired when a new conversation is created. Each member receives a personalized event with the other participant resolved via conversation.user or conversation.virtualContributor.',
})
export class ConversationCreatedEvent {
  @Field(() => IConversation, {
    description: 'The conversation that was created.',
  })
  conversation!: IConversation;

  @Field(() => IMessage, {
    nullable: true,
    description:
      'The first message in the conversation. Null when conversation is created without an initial message.',
  })
  message?: IMessage;
}

@ObjectType('ConversationMessageReceivedEvent', {
  description: 'Event fired when a new message is received in a conversation.',
})
export class ConversationMessageReceivedEvent {
  @Field(() => UUID, {
    description: 'The room ID where the message was received.',
  })
  roomId!: string;

  @Field(() => IMessage, { description: 'The message that was received.' })
  message!: IMessage;
}

@ObjectType('ConversationMessageRemovedEvent', {
  description: 'Event fired when a message is removed from a conversation.',
})
export class ConversationMessageRemovedEvent {
  @Field(() => UUID, {
    description: 'The room ID where the message was removed.',
  })
  roomId!: string;

  @Field(() => MessageID, {
    description: 'The ID of the message that was removed.',
  })
  messageId!: string;
}

@ObjectType('ConversationReadReceiptUpdatedEvent', {
  description: 'Event fired when a read receipt is updated in a conversation.',
})
export class ConversationReadReceiptUpdatedEvent {
  @Field(() => UUID, {
    description: 'The room ID where the read receipt was updated.',
  })
  roomId!: string;

  @Field(() => MessageID, {
    description: 'The ID of the last read event (message).',
  })
  lastReadEventId!: string;
}

@ObjectType('ConversationEventSubscriptionResult', {
  description: 'Payload for conversation subscription events.',
})
export class ConversationEventSubscriptionResult {
  @Field(() => ConversationEventType, {
    description:
      'The type of event. Use this to determine which payload field is populated.',
  })
  eventType!: ConversationEventType;

  @Field(() => ConversationCreatedEvent, {
    nullable: true,
    description: 'Present when eventType is CONVERSATION_CREATED.',
  })
  conversationCreated?: ConversationCreatedEvent;

  @Field(() => ConversationMessageReceivedEvent, {
    nullable: true,
    description: 'Present when eventType is MESSAGE_RECEIVED.',
  })
  messageReceived?: ConversationMessageReceivedEvent;

  @Field(() => ConversationMessageRemovedEvent, {
    nullable: true,
    description: 'Present when eventType is MESSAGE_REMOVED.',
  })
  messageRemoved?: ConversationMessageRemovedEvent;

  @Field(() => ConversationReadReceiptUpdatedEvent, {
    nullable: true,
    description: 'Present when eventType is READ_RECEIPT_UPDATED.',
  })
  readReceiptUpdated?: ConversationReadReceiptUpdatedEvent;
}
