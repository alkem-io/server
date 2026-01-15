import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UUID, MessageID } from '@domain/common/scalars';
import { IMessage } from '@domain/communication/message/message.interface';

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
