import { AuthorizationPrivilege } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NotificationInputOrganizationMessage } from '@services/adapters/notification-adapter/dto/organization/notification.input.organization.message';
import { NotificationInputCommunicationLeadsMessage } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.leads.message';
import { NotificationInputUserMessage } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.user.message';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversationService } from '../conversation/conversation.service';
import { CommunicationSendMessageToCommunityLeadsInput } from './dto/communication.dto.send.message.community.leads';
import { CommunicationSendMessageToOrganizationInput } from './dto/communication.dto.send.message.organization';
import { CommunicationSendMessageToUsersInput } from './dto/communication.dto.send.message.users';

@InstrumentResolver()
@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly notificationAdapterSpace: NotificationSpaceAdapter,
    private readonly notificationUserAdapter: NotificationUserAdapter,
    private readonly notificationOrganizationAdapter: NotificationOrganizationAdapter,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly conversationService: ConversationService,
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => Boolean, {
    description: 'Send message to multiple Users.',
  })
  async sendMessageToUsers(
    @CurrentActor() actorContext: ActorContext,
    @Args('messageData') messageData: CommunicationSendMessageToUsersInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send user message from: ${actorContext.actorId}`
    );

    for (const receiverId of messageData.receiverIds) {
      // Check if the receiving user allows messages from other users
      const receivingUser = await this.userService.getUserByIdOrFail(
        receiverId,
        {
          relations: {
            settings: true,
          },
        }
      );

      // Check if the user is willing to receive messages
      if (!receivingUser.settings.communication.allowOtherUsersToSendMessages) {
        throw new MessagingNotEnabledException(
          'User is not open to receiving messages',
          LogContext.USER,
          {
            userId: receivingUser.id,
            senderId: actorContext.actorId,
          }
        );
      }

      const notificationInput: NotificationInputUserMessage = {
        triggeredBy: actorContext.actorId,
        receiverID: receiverId,
        message: messageData.message,
      };
      await this.notificationUserAdapter.userToUserMessageDirect(
        notificationInput
      );
    }

    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Send message to an Organization.',
  })
  async sendMessageToOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('messageData')
    messageData: CommunicationSendMessageToOrganizationInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send message to organization ${messageData.organizationId} from: ${actorContext.actorId}`
    );

    const notificationInput: NotificationInputOrganizationMessage = {
      triggeredBy: actorContext.actorId,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('messageData')
    messageData: CommunicationSendMessageToCommunityLeadsInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send message to community ${messageData.communityId} from: ${actorContext.actorId}`
    );

    const notificationInput: NotificationInputCommunicationLeadsMessage = {
      triggeredBy: actorContext.actorId,
      communityID: messageData.communityId,
      message: messageData.message,
    };
    await this.notificationAdapterSpace.spaceCommunicationMessage(
      notificationInput
    );
    return true;
  }
}
