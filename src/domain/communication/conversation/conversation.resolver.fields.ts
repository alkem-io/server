import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  ContributorByAgentIdLoaderCreator,
  ConversationMembershipsLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IConversationMembershipWithActorType } from '@core/dataloader/creators/loader.creators/conversation/conversation.memberships.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { ConfigService } from '@nestjs/config';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  private readonly attachmentsEnabled: boolean;

  constructor(
    private readonly conversationService: ConversationService,
    private readonly authorizationService: AuthorizationService,
    configService: ConfigService<AlkemioConfig, true>
  ) {
    this.attachmentsEnabled = configService.get(
      'communications.message_attachments.enabled',
      { infer: true }
    );
  }

  @ResolveField('room', () => IRoom, {
    nullable: false,
    description: 'The room for this Conversation.',
  })
  async room(@Parent() conversation: IConversation): Promise<IRoom> {
    // Use eager-loaded room if available
    if (conversation.room !== undefined) {
      return conversation.room;
    }
    return await this.conversationService.getRoom(conversation.id);
  }

  @ResolveField('members', () => [IActor], {
    description:
      'All members of this Conversation, returned as actors with their types.',
  })
  async members(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembershipWithActorType[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IActor | null>
  ): Promise<IActor[]> {
    const memberships = await convoMembershipsLoader.load(conversation.id);

    const actors = await Promise.all(
      memberships.map(membership =>
        contributorByAgentLoader.load(membership.actorID)
      )
    );

    return actors.filter((actor): actor is IActor => actor !== null);
  }

  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description:
      "The storage bucket holding this Conversation's message attachments (feature 013). READ-gated to conversation members; null when message attachments are disabled.",
  })
  async storageBucket(
    @Parent() conversation: IConversation,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IStorageBucket | null> {
    // Behind the message-attachments feature flag (T016): the field exists in the
    // schema but resolves to null while disabled, so clients show no upload UI.
    if (!this.attachmentsEnabled) {
      return null;
    }
    // A conversation with no bucket yet is an accepted, backfillable state
    // (getStorageBucket throws EntityNotInitializedException). The field is
    // nullable, so resolve to null instead of failing the whole query; re-throw
    // anything else.
    let bucket: IStorageBucket;
    try {
      bucket = await this.conversationService.getStorageBucket(conversation.id);
    } catch (error) {
      if (error instanceof EntityNotInitializedException) {
        return null;
      }
      throw error;
    }
    // READ-gate (C1): the bucket auth mirrors the conversation-member credential,
    // so non-members are denied.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      bucket.authorization,
      AuthorizationPrivilege.READ,
      `conversation storage bucket: ${conversation.id}`
    );
    return bucket;
  }
}
