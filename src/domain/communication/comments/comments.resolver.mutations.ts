import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
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
  SUBSCRIPTION_ASPECT_COMMENT,
} from '@common/constants/providers';
import { CommentsAuthorizationService } from './comments.service.authorization';
import { IComments } from './comments.interface';
import { getRandomId } from '@src/common/utils';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.comment';
import { AspectMessageReceivedPayload } from '@domain/collaboration/aspect/dto/aspect.message.received.payload';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { NotificationInputAspectComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.comment';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';

@Resolver()
export class CommentsResolverMutations {
  constructor(
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private commentsService: CommentsService,
    private namingService: NamingService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private readonly subscriptionAspectComments: PubSubEngine,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  // todo should be removed to serve per entity e.g. send aspect comment
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
    const aspect = await this.namingService.getAspectForComments(
      messageData.commentsID
    );
    if (aspect) {
      this.processAspectCommentEvents(aspect, comments, commentSent, agentInfo);
      const activityLogInput: ActivityInputAspectComment = {
        triggeredBy: agentInfo.userID,
        aspect: aspect,
        message: commentSent.message,
      };
      await this.activityAdapter.aspectComment(activityLogInput);
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

  private async processAspectCommentEvents(
    aspect: IAspect,
    comments: IComments,
    commentSent: CommunicationMessageResult,
    agentInfo: AgentInfo
  ) {
    // build subscription payload
    const eventID = `comment-msg-${getRandomId()}`;
    const subscriptionPayload: AspectMessageReceivedPayload = {
      eventID: eventID,
      message: commentSent,
      aspectID: aspect.id,
    };
    // send the subscriptions event
    this.subscriptionAspectComments.publish(
      SubscriptionType.ASPECT_COMMENTS_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    // Send the notification
    const notificationInput: NotificationInputAspectComment = {
      triggeredBy: agentInfo.userID,
      aspect: aspect,
      comments: comments,
      commentSent: commentSent,
    };
    await this.notificationAdapter.aspectComment(notificationInput);
  }
}
