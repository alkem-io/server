import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommentsService } from './comments.service';
import { CommentsSendMessageInput } from './dto/comments.dto.send.message';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommentsRemoveMessageInput } from './dto/comments.dto.remove.message';
import { MessageID } from '@domain/common/scalars';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { EventType } from '@common/enums/event.type';

import { ClientProxy } from '@nestjs/microservices';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_UPDATE_MESSAGE,
} from '@common/constants/providers';
import { CommentsMessageReceived } from './dto/comments.dto.event.message.received';

@Resolver()
export class CommentsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private commentsService: CommentsService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
    @Inject(SUBSCRIPTION_UPDATE_MESSAGE)
    private readonly subscriptionUpdateMessage: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => CommunicationMessageResult, {
    description:
      'Sends an update message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendUpdate(
    @Args('messageData') messageData: CommentsSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult> {
    const comments = await this.commentsService.getCommentsOrFail(
      messageData.commentsID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.UPDATE,
      `comments send message: ${comments.displayName}`
    );

    const updateSent = await this.commentsService.sendCommentsMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );

    // Send the notifications event
    const notificationsPayload =
      await this.notificationsPayloadBuilder.buildCommunicationUpdateSentNotificationPayload(
        agentInfo.userID,
        comments
      );
    this.notificationsClient.emit<number>(
      EventType.COMMUNICATION_UPDATE_SENT,
      notificationsPayload
    );

    // Send the subscriptions event
    const eventID = `update-msg-${Math.floor(Math.random() * 100)}`;
    const subscriptionPayload: CommentsMessageReceived = {
      eventID: eventID,
      message: updateSent,
      commentsID: comments.id,
    };
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
    @Args('messageData') messageData: CommentsRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const comments = await this.commentsService.getCommentsOrFail(
      messageData.commentsID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.UPDATE,
      `communication send message: ${comments.displayName}`
    );
    return await this.commentsService.removeCommentsMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );
  }
}
