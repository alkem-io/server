import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

/**
 * GraphQL input for creating a conversation.
 * Either receiverActorId OR wellKnownVirtualContributor must be provided.
 * The receiver can be a User or VirtualContributor - type is determined at runtime.
 */
@InputType()
export class CreateConversationInput {
  @Field(() => UUID, {
    nullable: true,
    description:
      'Actor ID of the conversation receiver (User or VirtualContributor)',
  })
  receiverActorId?: string;

  @Field(() => VirtualContributorWellKnown, {
    nullable: true,
    description: 'Well-known VirtualContributor to start conversation with',
  })
  wellKnownVirtualContributor?: VirtualContributorWellKnown;
}
