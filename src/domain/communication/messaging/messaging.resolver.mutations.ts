import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  CreateConversationData,
  CreateConversationInput,
} from '@domain/communication/conversation/dto';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from '../conversation/conversation.interface';
import { MessagingService } from './messaging.service';

@InstrumentResolver()
@Resolver()
export class MessagingResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly messagingService: MessagingService,
    private readonly userLookupService: UserLookupService,
    private readonly virtualContributorLookupService: VirtualContributorLookupService,
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
      { with: { agent: true } }
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
          { with: { agent: true } }
        );
      internalData.invitedAgentId = vc.agent.id;
    } else if (!conversationData.wellKnownVirtualContributor) {
      // User-to-user: resolve other user's agent ID
      const otherUser = await this.userLookupService.getUserOrFail(
        conversationData.userID,
        { with: { agent: true } }
      );
      internalData.invitedAgentId = otherUser.agent.id;
    }

    // Authorization is now applied directly within createConversation
    return await this.messagingService.createConversation(internalData);
  }

  private async checkReceivingUserAccessAndSettings(
    agentInfo: AgentInfo,
    receivingUserID: string
  ) {
    const receivingUser = await this.userLookupService.getUserOrFail(
      receivingUserID,
      {
        with: {
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
