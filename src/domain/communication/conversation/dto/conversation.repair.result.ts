import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { RoomReadiness } from '@domain/communication/room/dto/room.readiness';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

/**
 * What a repair found and did. FAILED covers both a probe or creation that
 * the backend could not answer (readiness written FAILED) and a membership
 * change the backend rejected (readiness unchanged — the room exists).
 */
export enum ConversationRoomRepairOutcome {
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_VERIFIED = 'ROOM_VERIFIED',
  MEMBERSHIP_CONVERGED = 'MEMBERSHIP_CONVERGED',
  FAILED = 'FAILED',
}

registerEnumType(ConversationRoomRepairOutcome, {
  name: 'ConversationRoomRepairOutcome',
  description:
    'The outcome of repairing a conversation room: created, verified unchanged, membership converged, or failed.',
});

@ObjectType('ConversationRoomRepairResult', {
  description:
    'Result of an idempotent conversation room repair: the room is ensured to exist and its backend membership converged to the platform membership.',
})
export class ConversationRoomRepairResult {
  @Field(() => IConversation, {
    nullable: false,
    description: 'The repaired conversation.',
  })
  conversation!: IConversation;

  @Field(() => ConversationRoomRepairOutcome, {
    nullable: false,
    description: 'What the repair found and did.',
  })
  outcome!: ConversationRoomRepairOutcome;

  @Field(() => RoomReadiness, {
    nullable: false,
    description: 'The readiness of the conversation room after the repair.',
  })
  readiness!: RoomReadiness;

  @Field(() => Int, {
    nullable: false,
    description: 'Members added to the backend room.',
  })
  membersAdded!: number;

  @Field(() => Int, {
    nullable: false,
    description: 'Members removed from the backend room.',
  })
  membersRemoved!: number;

  @Field(() => String, {
    nullable: true,
    description:
      'Sanitized detail of at most 200 characters, naming the step that failed. Never a raw backend payload.',
  })
  detail?: string;
}
