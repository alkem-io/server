import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';

/**
 * GraphQL input for creating a conversation.
 * Used by the mutation resolver to accept user-friendly IDs.
 * The resolver resolves these to agent IDs before calling the service.
 */
@InputType()
@ObjectType('CreateConversationData')
export class CreateConversationInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  /**
   * @deprecated Type is now inferred from presence of virtualContributorID/wellKnownVirtualContributor.
   * Kept for backward compatibility with existing clients. Value is ignored.
   */
  @Field(() => CommunicationConversationType, { nullable: true })
  type?: CommunicationConversationType;

  @Field(() => UUID, { nullable: true })
  virtualContributorID?: string;

  @Field(() => VirtualContributorWellKnown, { nullable: true })
  wellKnownVirtualContributor?: VirtualContributorWellKnown;
}

/**
 * Internal DTO for creating a conversation.
 * Uses pure agent IDs - callers are responsible for resolution.
 * Either invitedAgentId OR wellKnownVirtualContributor must be provided.
 */
export interface CreateConversationData {
  /** Agent ID of the caller (creator of the conversation) */
  callerAgentId: string;

  /** Agent ID of the invited party (user or VC). Required if wellKnownVirtualContributor is not set. */
  invitedAgentId?: string;

  /** Well-known VC enum. Required if invitedAgentId is not set. Service will resolve to agent ID. */
  wellKnownVirtualContributor?: VirtualContributorWellKnown;
}
