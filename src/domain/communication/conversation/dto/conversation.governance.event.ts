import { IActor } from '@domain/actor/actor/actor.interface';
import { UUID } from '@domain/common/scalars';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { RoomReadiness } from '@domain/communication/room/dto/room.readiness';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

/**
 * Control-plane outcomes about a conversation. Deliberately no message,
 * reaction or read-receipt member: a browser that reads the messaging
 * backend directly must never receive a room event through this channel.
 */
export enum ConversationGovernanceEventType {
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  CONVERSATION_UPDATED = 'CONVERSATION_UPDATED',
  CONVERSATION_DELETED = 'CONVERSATION_DELETED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  ROOM_READINESS_CHANGED = 'ROOM_READINESS_CHANGED',
}

registerEnumType(ConversationGovernanceEventType, {
  name: 'ConversationGovernanceEventType',
  description:
    'The kind of governance outcome delivered on conversationGovernanceEvents.',
});

@ObjectType('ConversationGovernanceEvent', {
  description:
    'A governance outcome about one of the subscriber’s conversations: lifecycle, membership or room readiness. Carries no message, reaction or read-receipt data by construction — room events are read from the messaging backend directly.',
})
export class ConversationGovernanceEvent {
  @Field(() => ConversationGovernanceEventType, {
    nullable: false,
    description: 'The kind of governance outcome.',
  })
  eventType!: ConversationGovernanceEventType;

  @Field(() => UUID, {
    nullable: false,
    description: 'The conversation the outcome is about.',
  })
  conversationID!: string;

  @Field(() => IConversation, {
    nullable: true,
    description:
      'The conversation after the change. Null only for CONVERSATION_DELETED.',
  })
  conversation?: IConversation;

  @Field(() => IActor, {
    nullable: true,
    description: 'The actor that was added. Present for MEMBER_ADDED.',
  })
  member?: IActor;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The actor affected by a membership change. Present for MEMBER_ADDED and MEMBER_REMOVED (the removed member may no longer be resolvable).',
  })
  memberID?: string;

  @Field(() => RoomReadiness, {
    nullable: true,
    description:
      'The new readiness of the conversation room. Present for ROOM_READINESS_CHANGED.',
  })
  readiness?: RoomReadiness;
}
