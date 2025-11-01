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
import { ConversationsSetService } from './conversations.set.service';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { LogContext } from '@common/enums/logging.context';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CreateConversationInput } from '../conversation/dto/conversation.dto.create';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ConversationsSetAuthorizationService } from './conversations.set.service.authorization';

@InstrumentResolver()
@Resolver()
export class ConversationsSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private conversationsSetService: ConversationsSetService,
    private conversationsSetAuthorizationService: ConversationsSetAuthorizationService,
    private userLookupService: UserLookupService,
    private conversationService: ConversationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the ConversationsSet.',
  })
  async createConversationOnConversationsSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    // Get the conversations set for the current user
    const userWithConversationsSet = await this.userLookupService.getUserOrFail(
      agentInfo.userID!,
      {
        relations: {
          conversationsSet: true,
        },
      }
    );
    const conversationsSet = userWithConversationsSet.conversationsSet;
    if (!conversationsSet) {
      throw new ForbiddenException(
        `User(${agentInfo.userID}) does not have a conversations set.`,
        LogContext.COMMUNICATION
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversationsSet.authorization,
      AuthorizationPrivilege.CREATE,
      `create conversation on conversations Set: ${conversationsSet.id}`
    );

    // Also check if the receiving user wants to accept conversations
    if (conversationData.type === CommunicationConversationType.USER_USER) {
      await this.checkReceivingUserAccessAndSettings(
        agentInfo,
        conversationData.userID
      );
    }

    const conversation =
      await this.conversationsSetService.createConversationOnConversationsSet(
        conversationData,
        conversationsSet.id,
        true
      );

    // conversation needs to be saved to apply the authorization policy
    await this.conversationService.save(conversation);

    await this.conversationsSetAuthorizationService.resetAuthorizationOnConversations(
      agentInfo.userID!,
      conversationData.userID,
      conversationData.type
    );

    return await this.conversationService.getConversationOrFail(
      conversation.id
    );
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
