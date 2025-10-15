import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputUserMessage } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.user.message';
import { CommunicationSendMessageToUsersInput } from './dto/communication.dto.send.message.users';
import { NotificationInputOrganizationMessage } from '@services/adapters/notification-adapter/dto/organization/notification.input.organization.message';
import { CommunicationSendMessageToOrganizationInput } from './dto/communication.dto.send.message.organization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { CommunicationSendMessageToCommunityLeadsInput } from './dto/communication.dto.send.message.community.leads';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationInputCommunicationLeadsMessage } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.leads.message';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { UserService } from '@domain/community/user/user.service';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { LogContext } from '@common/enums/logging.context';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { UserSendMessageInput } from '@domain/communication/communication/dto/communication.dto.send.direct.message.user';

@InstrumentResolver()
@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communicationAdapter: CommunicationAdapter,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private notificationOrganizationAdapter: NotificationOrganizationAdapter,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => String, {
    description:
      'Sends a message on the specified User`s behalf and returns the room id',
  })
  async sendMessageToUserDirect(
    @Args('messageData') messageData: UserSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const receivingUser = await this.userService.getUserOrFail(
      messageData.receivingUserID,
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
      `user send message: ${receivingUser.id}`
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

    const message = await this.communicationAdapter.sendMessageToUser({
      senderCommunicationsID: agentInfo.communicationID,
      message: messageData.message,
      receiverCommunicationsID: receivingUser.communicationID,
    });
    // TODO: decide what should be the api
    return message.id;
  }

  @Mutation(() => Boolean, {
    description: 'Send message to multiple Users.',
  })
  async sendMessageToUsers(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('messageData') messageData: CommunicationSendMessageToUsersInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send user message from: ${agentInfo.email}`
    );

    for (const receiverId of messageData.receiverIds) {
      // Check if the receiving user allows messages from other users
      const receivingUser = await this.userService.getUserOrFail(receiverId, {
        relations: {
          settings: true,
        },
      });

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

      const notificationInput: NotificationInputUserMessage = {
        triggeredBy: agentInfo.userID,
        receiverID: receiverId,
        message: messageData.message,
      };
      await this.notificationUserAdapter.userToUserMessageDirect(
        notificationInput
      );
    }

    // To test out the logic
    if (messageData.receiverIds.length === 1) {
      if (this.communicationAdapter.directMessageRoomsEnabled) {
        this.logger.verbose?.(
          `Sending direct message to user via Matrix ${messageData.receiverIds[0]}`,
          LogContext.COMMUNICATION
        );
        // Send direct message if only one receiver
        const receiver = await this.userService.getUserOrFail(
          messageData.receiverIds[0]
        );
        if (receiver.id === agentInfo.userID) {
          this.logger.warn(
            `skipping sending to oneself: ${agentInfo.userID}`,
            LogContext.COMMUNICATION
          );
        }
        await this.communicationAdapter.sendMessageToUser({
          senderCommunicationsID: agentInfo.communicationID,
          message: messageData.message,
          receiverCommunicationsID: receiver.communicationID,
        });
      }
    }

    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Send message to an Organization.',
  })
  async sendMessageToOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('messageData')
    messageData: CommunicationSendMessageToOrganizationInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send message to organization ${messageData.organizationId} from: ${agentInfo.email}`
    );

    const notificationInput: NotificationInputOrganizationMessage = {
      triggeredBy: agentInfo.userID,
      message: messageData.message,
      organizationID: messageData.organizationId,
    };
    await this.notificationOrganizationAdapter.organizationSendMessage(
      notificationInput
    );

    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Send message to Community Leads.',
  })
  async sendMessageToCommunityLeads(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('messageData')
    messageData: CommunicationSendMessageToCommunityLeadsInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send message to community ${messageData.communityId} from: ${agentInfo.email}`
    );

    const notificationInput: NotificationInputCommunicationLeadsMessage = {
      triggeredBy: agentInfo.userID,
      communityID: messageData.communityId,
      message: messageData.message,
    };
    await this.notificationAdapterSpace.spaceCommunicationMessage(
      notificationInput
    );
    return true;
  }
}
