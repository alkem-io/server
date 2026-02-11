import { CurrentUser } from '@common/decorators';
import { AgentType } from '@common/enums/agent.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import {
  ContributorByAgentIdLoaderCreator,
  ConversationMembershipsLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
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
    convoMembershipsLoader: ILoader<IConversationMembership[]>
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
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembership[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IContributor | null>
  ): Promise<IUser | null> {
    // Check for pre-resolved value (used in subscription events for personalized delivery)
    if (conversation._resolvedUser !== undefined) {
      return conversation._resolvedUser;
    }

    const memberships = await convoMembershipsLoader.load(conversation.id);

    // Find a user member, excluding the current user's agent
    const userMembership = memberships.find(
      m => m.agent?.type === AgentType.USER && m.agentId !== agentInfo.agentID
    );

    if (!userMembership) {
      return null;
    }

    // Use the contributor loader to batch load the user
    const contributor = await contributorByAgentLoader.load(
      userMembership.agentId
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
    convoMembershipsLoader: ILoader<IConversationMembership[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IContributor | null>
  ): Promise<IVirtualContributor | null> {
    // Check for pre-resolved value (used in subscription events)
    if (conversation._resolvedVirtualContributor !== undefined) {
      return conversation._resolvedVirtualContributor;
    }

    const memberships = await convoMembershipsLoader.load(conversation.id);

    // Find the virtual contributor agent among members
    const vcMembership = memberships.find(
      m => m.agent?.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    if (!vcMembership?.agentId) {
      return null;
    }

    // Use the contributor loader to batch load the virtual contributor
    const contributor = await contributorByAgentLoader.load(
      vcMembership.agentId
    );
    return contributor as IVirtualContributor | null;
  }
}
