import { CurrentActor } from '@common/decorators';
import { ActorType } from '@common/enums/actor.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  ContributorByAgentIdLoaderCreator,
  ConversationMembershipsLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IConversationMembershipWithActorType } from '@core/dataloader/creators/loader.creators/conversation/conversation.memberships.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(private readonly conversationService: ConversationService) {}

  @ResolveField('room', () => IRoom, {
    nullable: true,
    description: 'The room for this Conversation.',
  })
  async room(
    @Parent() conversation: IConversation
  ): Promise<IRoom | undefined> {
    // Use eager-loaded room if available
    if (conversation.room !== undefined) {
      return conversation.room;
    }
    return await this.conversationService.getRoom(conversation.id);
  }

  @ResolveField('type', () => CommunicationConversationType, {
    nullable: false,
    description:
      'The type of this Conversation (USER_USER or USER_VC), inferred from member agent types.',
  })
  async type(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembershipWithActorType[]>
  ): Promise<CommunicationConversationType> {
    const memberships = await convoMembershipsLoader.load(conversation.id);

    return this.conversationService.inferConversationType(memberships);
  }

  @ResolveField('user', () => IUser, {
    nullable: true,
    description:
      'The other user participating in this Conversation (excludes the current user).',
  })
  async user(
    @Parent() conversation: IConversation,
    @CurrentActor() actorContext: ActorContext,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembershipWithActorType[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IActor | null>
  ): Promise<IUser | null> {
    // Check for pre-resolved value (used in subscription events for personalized delivery)
    if (conversation._resolvedUser !== undefined) {
      return conversation._resolvedUser;
    }

    const memberships = await convoMembershipsLoader.load(conversation.id);

    // Find a user member, excluding the current user's agent
    const userMembership = memberships.find(
      m => m.actorType === ActorType.USER && m.actorID !== actorContext.actorID
    );

    if (!userMembership) {
      return null;
    }

    // Use the contributor loader to batch load the user
    const contributor = await contributorByAgentLoader.load(
      userMembership.actorID
    );
    return contributor as IUser | null;
  }

  @ResolveField('virtualContributor', () => IVirtualContributor, {
    nullable: true,
    description:
      'The virtual contributor participating in this Conversation (only for USER_AGENT conversations).',
  })
  async virtualContributor(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembershipWithActorType[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IActor | null>
  ): Promise<IVirtualContributor | null> {
    // Check for pre-resolved value (used in subscription events)
    if (conversation._resolvedVirtualContributor !== undefined) {
      return conversation._resolvedVirtualContributor;
    }

    const memberships = await convoMembershipsLoader.load(conversation.id);

    // Find the virtual contributor agent among members
    const vcMembership = memberships.find(
      m => m.actorType === ActorType.VIRTUAL
    );

    if (!vcMembership?.actorID) {
      return null;
    }

    // Use the contributor loader to batch load the virtual contributor
    const contributor = await contributorByAgentLoader.load(
      vcMembership.actorID
    );
    return contributor as IVirtualContributor | null;
  }
}
