import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputUserMessage } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.message';
import { CommunicationSendMessageToUserInput } from './dto/communication.dto.send.message.user';
import { NotificationInputOrganizationMessage } from '@services/adapters/notification-adapter/dto/notification.input.organization.message';
import { CommunicationSendMessageToOrganizationInput } from './dto/communication.dto.send.message.organization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { NotificationInputCommunityLeadsMessage } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.leads.message';
import { CommunicationSendMessageToCommunityLeadsInput } from './dto/communication.dto.send.message.community.leads';

@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
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
      await this.notificationAdapter.sendUserMessage(notificationInput);
    }

    return true;
  }
  @UseGuards(GraphqlGuard)
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
    await this.notificationAdapter.sendOrganizationMessage(notificationInput);

    return true;
  }

  @UseGuards(GraphqlGuard)
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

    const notificationInput: NotificationInputCommunityLeadsMessage = {
      triggeredBy: agentInfo.userID,
      communityID: messageData.communityId,
      message: messageData.message,
    };
    await this.notificationAdapter.sendCommunityLeadsMessage(notificationInput);
    return true;
  }
}
