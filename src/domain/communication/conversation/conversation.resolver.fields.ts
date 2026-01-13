import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationAgentPrivilege, CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IRoom } from '@domain/communication/room/room.interface';
import { ConversationService } from './conversation.service';
import { IConversation } from './conversation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { AgentType } from '@common/enums/agent.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunicationRoomWithReadStateResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.with.read.state.result';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly conversationService: ConversationService,
    private readonly virtualContributorLookupService: VirtualContributorLookupService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('room', () => IRoom, {
    nullable: true,
    description: 'The room for this Conversation.',
  })
  async room(
    @Parent() conversation: IConversation
  ): Promise<IRoom | undefined> {
    return await this.conversationService.getRoom(conversation.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'roomWithReadState',
    () => CommunicationRoomWithReadStateResult,
    {
      nullable: true,
      description:
        'The room for this Conversation with read state for the current user.',
    }
  )
  async roomWithReadState(
    @Parent() conversation: IConversation,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationRoomWithReadStateResult | undefined> {
    return await this.conversationService.getRoomWithReadState(
      conversation.id,
      agentInfo.agentID
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('type', () => CommunicationConversationType, {
    nullable: false,
    description:
      'The type of this Conversation (USER_USER or USER_VC), inferred from member agent types.',
  })
  async type(
    @Parent() conversation: IConversation
  ): Promise<CommunicationConversationType> {
    return await this.conversationService.inferConversationType(
      conversation.id
    );
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
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser | null> {
    return await this.conversationService.getUserFromConversation(
      conversation.id,
      agentInfo.agentID
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributor', () => IVirtualContributor, {
    nullable: true,
    description:
      'The virtual contributor participating in this Conversation (only for USER_AGENT conversations).',
  })
  async virtualContributor(
    @Parent() conversation: IConversation
  ): Promise<IVirtualContributor | null> {
    const memberships = await this.conversationService.getConversationMembers(
      conversation.id
    );

    // Find the virtual contributor agent among members
    const vcMembership = memberships.find(
      m => m.agent?.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    if (!vcMembership?.agentId) {
      return null;
    }

    return await this.virtualContributorLookupService.getVirtualContributorByAgentId(
      vcMembership.agentId
    );
  }
}
