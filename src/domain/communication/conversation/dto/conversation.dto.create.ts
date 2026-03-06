import { SMALL_TEXT_LENGTH } from '@common/constants';
import { ConversationCreationType } from '@common/enums/conversation.creation.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

/**
 * GraphQL input for creating a conversation.
 * Unified input for both DIRECT and GROUP conversations.
 * - DIRECT: exactly 1 memberID (the other party). Creator is auto-included.
 * - GROUP: 1+ memberIDs. Creator is auto-included. Minimum 2 total members (creator + 1).
 */
@InputType()
export class CreateConversationInput {
  @Field(() => ConversationCreationType, {
    description:
      'The type of conversation to create: DIRECT for 1-on-1, GROUP for multi-party.',
  })
  type!: ConversationCreationType;

  @Field(() => [UUID], {
    description:
      'IDs of members to add. For DIRECT: exactly 1 ID. For GROUP: 1+ IDs. Creator is auto-included.',
  })
  memberIDs!: string[];

  @Field(() => String, {
    nullable: true,
    description:
      'Optional display name for GROUP conversations. Ignored for DIRECT conversations (Synapse uses the other member name automatically).',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional avatar URL for GROUP conversations. Ignored for DIRECT conversations. Accepts mxc:// or https:// URLs.',
  })
  avatarUrl?: string;
}

/**
 * Internal DTO for creating a conversation.
 * Uses pure agent IDs — callers are responsible for resolution.
 */
export interface CreateConversationData {
  /** The type of conversation to create */
  type: ConversationCreationType;

  /** Actor ID of the caller (creator of the conversation) */
  callerAgentId: string;

  /** Actor IDs of the invited members (excluding the caller) */
  memberAgentIds: string[];

  /** Optional display name for GROUP conversations */
  displayName?: string;

  /** Optional avatar URL for GROUP conversations (mxc:// or https://) */
  avatarUrl?: string;
}
