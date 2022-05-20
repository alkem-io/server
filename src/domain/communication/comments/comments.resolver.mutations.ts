import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { getConnection } from 'typeorm';
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
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_UPDATE_MESSAGE,
} from '@common/constants/providers';
import { CommentsMessageReceived } from './dto/comments.dto.event.message.received';
import { CommentsAuthorizationService } from './comments.service.authorization';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { ClientProxy } from '@nestjs/microservices';

@Resolver()
export class CommentsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private commentsService: CommentsService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    @Inject(SUBSCRIPTION_UPDATE_MESSAGE)
    private readonly subscriptionUpdateMessage: PubSubEngine,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => CommunicationMessageResult, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendComment(
    @Args('messageData') messageData: CommentsSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult> {
    const comments = await this.commentsService.getCommentsOrFail(
      messageData.commentsID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `comments send message: ${comments.displayName}`
    );

    const commentSent = await this.commentsService.sendCommentsMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );

    // Send the subscriptions event
    const eventID = `comment-msg-${Math.floor(Math.random() * 100)}`;
    const subscriptionPayload: CommentsMessageReceived = {
      eventID: eventID,
      message: commentSent,
      commentsID: comments.id,
    };
    this.subscriptionUpdateMessage.publish(
      SubscriptionType.COMMUNICATION_COMMENTS_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    const [result]: { displayName: string; createdBy: string }[] =
      await getConnection().query(
        `SELECT displayName, createdBy from aspect WHERE commentsId = '${messageData.commentsID}'`
      );

    if (result) {
      const payload =
        await this.notificationsPayloadBuilder.buildCommentCreatedOnAspectPayload(
          result.displayName,
          result.createdBy,
          messageData.commentsID,
          commentSent
        );

      this.notificationsClient.emit<number>(
        EventType.COMMENT_CREATED_ON_ASPECT,
        payload
      );
    }

    return commentSent;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => MessageID, {
    description: 'Removes a comment message.',
  })
  @Profiling.api
  async removeComment(
    @Args('messageData') messageData: CommentsRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const comments = await this.commentsService.getCommentsOrFail(
      messageData.commentsID
    );
    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the message in question to remove the message by
    // extending the authorization policy in memory but do not persist it.
    const extendedAuthorization =
      await this.commentsAuthorizationService.extendAuthorizationPolicyForMessageSender(
        comments,
        messageData.messageID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `comments remove message: ${comments.displayName}`
    );
    return await this.commentsService.removeCommentsMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );
  }
}
