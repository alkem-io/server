import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IRoom } from '@domain/communication/room/room.interface';
import { ConversationService } from './conversation.service';
import { IConversation } from './conversation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { AgentType } from '@common/enums/agent.type';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly conversationService: ConversationService,
    private readonly userLookupService: UserLookupService,
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
  @ResolveField('user', () => IUser || null, {
    nullable: true,
    description: 'The user participating in this Conversation.',
  })
  async user(@Parent() conversation: IConversation): Promise<IUser | null> {
    const memberships = await this.conversationService.getConversationMembers(
      conversation.id
    );

    // Find the user agent among members
    const userMembership = memberships.find(
      m => m.agent?.type === AgentType.USER
    );

    if (!userMembership?.agentId) {
      return null;
    }

    return await this.userLookupService.getUserByAgentId(
      userMembership.agentId
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
