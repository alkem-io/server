import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdatesService } from './updates.service';
import { UpdatesSendMessageInput } from './dto/updates.dto.send.message';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UpdatesRemoveMessageInput } from './dto/updates.dto.remove.message';
import { MessageID } from '@domain/common/scalars';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { CommunicationUpdateMessageReceived } from './dto/updates.dto.event.message.received';
import { SUBSCRIPTION_UPDATE_MESSAGE } from '@common/constants/providers';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { getRandomId } from '@src/common';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/notification.dto.input.update.sent';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';

@Resolver()
export class UpdatesResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private updatesService: UpdatesService,
    @Inject(SUBSCRIPTION_UPDATE_MESSAGE)
    private readonly subscriptionUpdateMessage: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => CommunicationMessageResult, {
    description:
      'Sends an update message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendUpdate(
    @Args('messageData') messageData: UpdatesSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult> {
    const updates = await this.updatesService.getUpdatesOrFail(
      messageData.updatesID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      updates.authorization,
      AuthorizationPrivilege.UPDATE,
      `updates send message: ${updates.displayName}`
    );

    const updateSent = await this.updatesService.sendUpdateMessage(
      updates,
      agentInfo.communicationID,
      messageData
    );

    // Send the notification
    const notificationInput: NotificationInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: updates,
    };
    await this.notificationAdapter.updateSent(notificationInput);

    // Send the subscriptions event
    const eventID = `update-msg-${getRandomId()}`;
    const subscriptionPayload: CommunicationUpdateMessageReceived = {
      eventID: eventID,
      message: updateSent,
      updatesID: updates.id,
    };
    this.logger.verbose?.(
      `[Update message sent] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionUpdateMessage.publish(
      SubscriptionType.COMMUNICATION_UPDATE_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    return updateSent;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => MessageID, {
    description: 'Removes an update message.',
  })
  @Profiling.api
  async removeUpdate(
    @Args('messageData') messageData: UpdatesRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const updates = await this.updatesService.getUpdatesOrFail(
      messageData.updatesID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      updates.authorization,
      AuthorizationPrivilege.UPDATE,
      `communication send message: ${updates.displayName}`
    );
    return await this.updatesService.removeUpdateMessage(
      updates,
      agentInfo.communicationID,
      messageData
    );
  }
}
