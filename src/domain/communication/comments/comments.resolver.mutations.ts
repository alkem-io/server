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
import { IMessage } from '../message/message.interface';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_ASPECT_COMMENT } from '@common/constants/providers';
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
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { CalendarEventCommentsMessageReceived } from '@domain/timeline/event/dto/event.dto.event.message.received';
import { MessagingService } from '../messaging/messaging.service';
import { CommentType } from '@common/enums/comment.type';
import { ICalendarEvent } from '@domain/timeline/event';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';

@Resolver()
export class CommentsResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private elasticService: ElasticsearchService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private commentsService: CommentsService,
    private namingService: NamingService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    private messagingService: MessagingService,
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private readonly subscriptionAspectComments: PubSubEngine
  ) {}

  // todo should be removed to serve per entity e.g. send aspect comment
  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendComment(
    @Args('messageData') messageData: CommentsSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
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
        message: commentSent,
      };
      this.activityAdapter.aspectComment(activityLogInput);

      const { hubID } =
        await this.communityResolverService.getCommunityFromCardCommentsOrFail(
          messageData.commentsID
        );

      this.elasticService.calloutCardCommentCreated(
        {
          id: aspect.id,
          name: aspect.profile.displayName,
          hub: hubID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    }

    const calendar = await this.namingService.getCalendarEventForComments(
      messageData.commentsID
    );
    if (calendar) {
      this.processCalendarEventCommentEvents(
        calendar,
        comments,
        commentSent,
        agentInfo
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
    const messageID = await this.commentsService.removeCommentsMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );
    const activityMessageRemoved: ActivityInputMessageRemoved = {
      triggeredBy: agentInfo.userID,
      messageID: messageID,
    };
    await this.activityAdapter.messageRemoved(activityMessageRemoved);
    return messageID;
  }

  private async processAspectCommentEvents(
    aspect: IAspect,
    comments: IComments,
    commentSent: IMessage,
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

    const mentions = getMentionsFromText(commentSent.message);

    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: commentSent.message,
      commentsId: comments.id,
      mentions,
      originEntity: {
        id: aspect.id,
        nameId: aspect.nameID,
        displayName: aspect.profile.displayName,
      },
      commentType: CommentType.CARD,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }

  private processCalendarEventCommentEvents(
    calendarEvent: ICalendarEvent,
    comments: IComments,
    commentSent: IMessage,
    agentInfo: AgentInfo
  ) {
    // build subscription payload
    const eventID = `comment-msg-${getRandomId()}`;
    const subscriptionPayload: CalendarEventCommentsMessageReceived = {
      eventID: eventID,
      message: commentSent,
      calendarEventID: calendarEvent.id,
    };
    // send the subscriptions event
    this.subscriptionAspectComments.publish(
      SubscriptionType.CALENDAR_EVENT_COMMENTS_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    const mentions = getMentionsFromText(commentSent.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: commentSent.message,
      commentsId: comments.id,
      mentions,
      originEntity: {
        id: calendarEvent.id,
        nameId: calendarEvent.nameID,
        displayName: calendarEvent.profile.displayName,
      },
      commentType: CommentType.CALENDAR_EVENT,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }
}
