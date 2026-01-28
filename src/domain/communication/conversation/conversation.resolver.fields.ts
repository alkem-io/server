import { AuthorizationAgentPrivilege, CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentType } from '@common/enums/agent.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
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
import { UseGuards } from '@nestjs/common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(private readonly conversationService: ConversationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('room', () => IRoom, {
    nullable: true,
    description: 'The room for this Conversation.',
  })
  async room(
    @Parent() conversation: IConversation
  ): Promise<IRoom | undefined> {
    // Use eager-loaded room if available (from getConversationsForAgent)
    if (conversation.room !== undefined) {
      return conversation.room;
    }
    return await this.conversationService.getRoom(conversation.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('type', () => CommunicationConversationType, {
    nullable: false,
    description:
      'The type of this Conversation (USER_USER or USER_VC), inferred from member agent types.',
  })
  async type(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    membershipsLoader: ILoader<IConversationMembership[]>
  ): Promise<CommunicationConversationType> {
    const memberships = await membershipsLoader.load(conversation.id);

    // Check if any agent is a virtual contributor using agent.type field
    const hasVC = memberships.some(
      m => m.agent?.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    return hasVC
      ? CommunicationConversationType.USER_VC
      : CommunicationConversationType.USER_USER;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('user', () => IUser, {
    nullable: true,
    description:
      'The other user participating in this Conversation (excludes the current user).',
  })
  async user(
    @Parent() conversation: IConversation,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ConversationMembershipsLoaderCreator)
    membershipsLoader: ILoader<IConversationMembership[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorLoader: ILoader<IContributor | null>
  ): Promise<IUser | null> {
    // Check for pre-resolved value (used in subscription events for personalized delivery)
    if (conversation._resolvedUser !== undefined) {
      return conversation._resolvedUser;
    }

    const memberships = await membershipsLoader.load(conversation.id);

    // Find a user member, excluding the current user's agent
    const userMembership = memberships.find(
      m => m.agent?.type === AgentType.USER && m.agentId !== agentInfo.agentID
    );

    if (!userMembership) {
      return null;
    }

    // Use the contributor loader to batch load the user
    const contributor = await contributorLoader.load(userMembership.agentId);
    return contributor as IUser | null;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributor', () => IVirtualContributor, {
    nullable: true,
    description:
      'The virtual contributor participating in this Conversation (only for USER_AGENT conversations).',
  })
  async virtualContributor(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    membershipsLoader: ILoader<IConversationMembership[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorLoader: ILoader<IContributor | null>
  ): Promise<IVirtualContributor | null> {
    // Check for pre-resolved value (used in subscription events)
    if (conversation._resolvedVirtualContributor !== undefined) {
      return conversation._resolvedVirtualContributor;
    }

    const memberships = await membershipsLoader.load(conversation.id);

    // Find the virtual contributor agent among members
    const vcMembership = memberships.find(
      m => m.agent?.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    if (!vcMembership?.agentId) {
      return null;
    }

    // Use the contributor loader to batch load the virtual contributor
    const contributor = await contributorLoader.load(vcMembership.agentId);
    return contributor as IVirtualContributor | null;
  }
}
