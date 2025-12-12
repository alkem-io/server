import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from '../conversation/conversation.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationService } from '../conversation/conversation.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { MessagingService } from './messaging.service';
import { LogContext } from '@common/enums/logging.context';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import {
  CreateConversationInput,
  CreateConversationData,
} from '../conversation/dto/conversation.dto.create';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { MessagingAuthorizationService } from './messaging.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

@InstrumentResolver()
@Resolver()
export class MessagingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private readonly messagingService: MessagingService,
    private readonly messagingAuthorizationService: MessagingAuthorizationService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private conversationService: ConversationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the Messaging.',
  })
  async createConversation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    // Get the platform messaging
    const messaging = await this.messagingService.getPlatformMessaging();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      messaging.authorization,
      AuthorizationPrivilege.CREATE,
      `create conversation on messaging: ${messaging.id}`
    );

    // Infer conversation type from input
    const isUserVc =
      !!conversationData.virtualContributorID ||
      !!conversationData.wellKnownVirtualContributor;
    const conversationType = isUserVc
      ? CommunicationConversationType.USER_VC
      : CommunicationConversationType.USER_USER;

    // Also check if the receiving user wants to accept conversations
    if (conversationType === CommunicationConversationType.USER_USER) {
      await this.checkReceivingUserAccessAndSettings(
        agentInfo,
        conversationData.userID
      );
    }

    // Resolve current user's agent ID
    const currentUser = await this.userLookupService.getUserOrFail(
      agentInfo.userID,
      { relations: { agent: true } }
    );
    const callerAgentId = currentUser.agent.id;

    // Build internal DTO with agent IDs
    const internalData: CreateConversationData = {
      callerAgentId,
      wellKnownVirtualContributor: conversationData.wellKnownVirtualContributor,
    };

    // Resolve invited party to agent ID
    if (conversationData.virtualContributorID) {
      const vc =
        await this.virtualContributorLookupService.getVirtualContributorOrFail(
          conversationData.virtualContributorID,
          { relations: { agent: true } }
        );
      internalData.invitedAgentId = vc.agent.id;
    } else if (!conversationData.wellKnownVirtualContributor) {
      // User-to-user: resolve other user's agent ID
      const otherUser = await this.userLookupService.getUserOrFail(
        conversationData.userID,
        { relations: { agent: true } }
      );
      internalData.invitedAgentId = otherUser.agent.id;
    }

    const conversation =
      await this.messagingService.createConversation(internalData);

    await this.messagingAuthorizationService.resetAuthorizationOnConversations(
      agentInfo.userID,
      conversationData.userID
    );

    return await this.conversationService.getConversationOrFail(
      conversation.id
    );
  }

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the ConversationsSet.',
    deprecationReason: 'Use createConversation instead',
  })
  async createConversationOnConversationsSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    return this.createConversation(agentInfo, conversationData);
  }

  private async checkReceivingUserAccessAndSettings(
    agentInfo: AgentInfo,
    receivingUserID: string
  ) {
    const receivingUser = await this.userLookupService.getUserOrFail(
      receivingUserID,
      {
        relations: {
          settings: true,
        },
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user ${agentInfo.userID} starting conversation with: ${receivingUser.id}`
    );

    if (!receivingUser.settings) {
      throw new EntityNotInitializedException(
        'User settings not initialized',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Check if the user is willing to receive messages
    if (!receivingUser.settings.communication.allowOtherUsersToSendMessages) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.USER,
        {
          userId: receivingUser.id,
          senderId: agentInfo.userID,
        }
      );
    }
  }
}
