import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputUserMessage } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.user.message';
import { CommunicationSendMessageToUserInput } from './dto/communication.dto.send.message.user';
import { NotificationInputOrganizationMessage } from '@services/adapters/notification-adapter/dto/organization/notification.input.organization.message';
import { CommunicationSendMessageToOrganizationInput } from './dto/communication.dto.send.message.organization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { CommunicationSendMessageToCommunityLeadsInput } from './dto/communication.dto.send.message.community.leads';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationInputCommunicationLeadsMessage } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.leads.message';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';

@InstrumentResolver()
@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private notificationOrganizationAdapter: NotificationOrganizationAdapter,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => Boolean, {
    description: 'Send message to a User.',
  })
  async sendMessageToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('messageData') messageData: CommunicationSendMessageToUserInput
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `send user message from: ${agentInfo.email}`
    );

    for (const receiverId of messageData.receiverIds) {
      const notificationInput: NotificationInputUserMessage = {
        triggeredBy: agentInfo.userID,
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
