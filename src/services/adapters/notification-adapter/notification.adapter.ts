import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputPostCreated } from './dto/notification.dto.input.post.created';
import { NotificationInputCalloutPublished } from './dto/notification.dto.input.callout.published';
import { NotificationInputPostComment } from './dto/notification.dto.input.post.comment';
import { NotificationPayloadBuilder } from './notification.payload.builder';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { NotificationInputCollaborationInterest } from './dto/notification.dto.input.collaboration.interest';
import { NotificationInputUpdateSent } from './dto/notification.dto.input.update.sent';
import { NotificationInputForumDiscussionCreated } from './dto/notification.dto.input.discussion.created';
import { NotificationInputCommunityApplication } from './dto/notification.dto.input.community.application';
import { NotificationInputCommunityNewMember } from './dto/notification.dto.input.community.new.member';
import { NotificationInputCommunityContextReview } from './dto/notification.dto.input.community.context.review';
import { NotificationInputUserRegistered } from './dto/notification.dto.input.user.registered';
import { NotificationInputUserRemoved } from './dto/notification.dto.input.user.removed';
import { NotificationInputWhiteboardCreated } from './dto/notification.dto.input.whiteboard.created';
import { NotificationInputDiscussionComment } from './dto/notification.dto.input.discussion.comment';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { NotificationInputUserMessage } from './dto/notification.dto.input.user.message';
import { NotificationInputOrganizationMessage } from './dto/notification.input.organization.message';
import { NotificationInputCommunityLeadsMessage } from './dto/notification.dto.input.community.leads.message';
import { NotificationInputEntityMention } from './dto/notification.dto.input.entity.mention';
import { NotificationInputEntityMentions } from './dto/notification.dto.input.entity.mentions';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { NotificationInputForumDiscussionComment } from './dto/notification.dto.input.forum.discussion.comment';
import { NotificationInputCommunityInvitation } from './dto/notification.dto.input.community.invitation';
import { NotificationInputCommentReply } from './dto/notification.dto.input.comment.reply';
import { NotificationInputCommunityInvitationExternal } from './dto/notification.dto.input.community.invitation.external';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationPayloadBuilder: NotificationPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  public async calloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildCalloutPublishedPayload(
        eventData.triggeredBy,
        eventData.callout
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async postCreated(
    eventData: NotificationInputPostCreated
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_POST_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildPostCreatedPayload(eventData);

    this.notificationsClient.emit<number>(event, payload);
  }

  public async whiteboardCreated(
    eventData: NotificationInputWhiteboardCreated
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_WHITEBOARD_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildWhiteboardCreatedPayload(
        eventData
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async collaborationInterest(
    eventData: NotificationInputCollaborationInterest
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_INTEREST;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildCollaborationInterestPayload(
        eventData.triggeredBy,
        eventData.collaboration,
        eventData.relation
      );
    this.notificationsClient.emit(event, payload);
  }

  public async postComment(
    eventData: NotificationInputPostComment
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_POST_COMMENT;
    this.logEventTriggered(eventData, event);
    // build notification payload
    const payload =
      await this.notificationPayloadBuilder.buildCommentCreatedOnPostPayload(
        eventData
      );
    // send notification event
    this.notificationsClient.emit<number>(event, payload);
  }

  public async discussionComment(
    eventData: NotificationInputDiscussionComment
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_DISCUSSION_COMMENT;
    this.logEventTriggered(eventData, event);

    // build notification payload
    const payload =
      await this.notificationPayloadBuilder.buildCommentCreatedOnDiscussionPayload(
        eventData.callout,
        eventData.comments.id,
        eventData.commentSent
      );
    // send notification event
    this.notificationsClient.emit<number>(event, payload);
  }

  public async forumDiscussionComment(
    eventData: NotificationInputForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_FORUM_DISCUSSION_COMMENT;
    this.logEventTriggered(eventData, event);

    // build notification payload
    const payload =
      await this.notificationPayloadBuilder.buildCommentCreatedOnForumDiscussionPayload(
        eventData.discussion,
        eventData.commentSent
      );
    // send notification event
    this.notificationsClient.emit<number>(event, payload);
  }

  public async commentReply(
    eventData: NotificationInputCommentReply
  ): Promise<void> {
    const event = NotificationEventType.COMMENT_REPLY;
    this.logEventTriggered(eventData, event);

    try {
      // build notification payload
      const payload =
        await this.notificationPayloadBuilder.buildCommentReplyPayload(
          eventData
        );
      // send notification event
      this.notificationsClient.emit<number>(event, payload);
    } catch (error: any) {
      this.logger.error(
        `Error while building comment reply notification payload ${error?.message}`,
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }
  }

  public async updateSent(
    eventData: NotificationInputUpdateSent
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_UPDATE_SENT;
    this.logEventTriggered(eventData, event);

    // Send the notifications event
    const notificationsPayload =
      await this.notificationPayloadBuilder.buildCommunicationUpdateSentNotificationPayload(
        eventData.triggeredBy,
        eventData.updates
      );
    this.notificationsClient.emit<number>(event, notificationsPayload);
  }

  public async forumDiscussionCreated(
    eventData: NotificationInputForumDiscussionCreated
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_FORUM_DISCUSSION_CREATED;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildPlatformForumDiscussionCreatedNotificationPayload(
        eventData.discussion
      );
    this.notificationsClient.emit<number>(event, payload);
  }

  public async sendUserMessage(
    eventData: NotificationInputUserMessage
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_USER_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationUserMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.receiverID,
        eventData.message
      );
    this.notificationsClient.emit<number>(event, payload);
  }

  public async sendOrganizationMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_ORGANIZATION_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationOrganizationMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.message,
        eventData.organizationID
      );
    this.notificationsClient.emit<number>(event, payload);
  }

  public async sendCommunityLeadsMessage(
    eventData: NotificationInputCommunityLeadsMessage
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_COMMUNITY_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationCommunityLeadsMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.message,
        eventData.communityID
      );
    this.notificationsClient.emit<number>(event, payload);
  }

  public async userMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_USER_MENTION;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationUserMentionNotificationPayload(
        eventData.triggeredBy,
        eventData.mentionedEntityID,
        eventData.comment,
        eventData.commentsId,
        eventData.originEntity.id,
        eventData.originEntity.nameId,
        eventData.originEntity.displayName,
        eventData.commentType
      );

    if (payload) {
      this.notificationsClient.emit<number>(event, payload);
    }
  }

  public async organizationMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_ORGANIZATION_MENTION;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationPayloadBuilder.buildCommunicationOrganizationMentionNotificationPayload(
        eventData.triggeredBy,
        eventData.mentionedEntityID,
        eventData.comment,
        eventData.commentsId,
        eventData.originEntity.id,
        eventData.originEntity.nameId,
        eventData.originEntity.displayName,
        eventData.commentType
      );

    if (payload) {
      this.notificationsClient.emit<number>(event, payload);
    }
  }

  public async entityMentions(
    eventData: NotificationInputEntityMentions
  ): Promise<void> {
    for (const mention of eventData.mentions) {
      const entityMentionNotificationInput: NotificationInputEntityMention = {
        triggeredBy: eventData.triggeredBy,
        comment: eventData.comment,
        mentionedEntityID: mention.nameId,
        commentsId: eventData.roomId,
        originEntity: eventData.originEntity,
        commentType: eventData.commentType,
      };

      if (mention.type == MentionedEntityType.USER) {
        this.userMention(entityMentionNotificationInput);
      }
      if (mention.type == MentionedEntityType.ORGANIZATION) {
        this.organizationMention(entityMentionNotificationInput);
      }
    }
  }

  public async applicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_APPLICATION_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildApplicationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.triggeredBy,
        eventData.community
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async invitationCreated(
    eventData: NotificationInputCommunityInvitation
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_INVITATION_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildInvitationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.invitedUser,
        eventData.community
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async externalInvitationCreated(
    eventData: NotificationInputCommunityInvitationExternal
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_EXTERNAL_INVITATION_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildExternalInvitationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.invitedUser,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async communityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_NEW_MEMBER;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildCommunityNewMemberPayload(
        eventData.triggeredBy,
        eventData.userID,
        eventData.community
      );
    this.notificationsClient.emit(event, payload);
  }

  public async communityContextReview(
    eventData: NotificationInputCommunityContextReview
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_CONTEXT_REVIEW_SUBMITTED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildCommunityContextReviewSubmittedNotificationPayload(
        eventData.triggeredBy,
        eventData.community.id,
        eventData.questions
      );
    this.notificationsClient.emit(event, payload);
  }

  public async userRegistered(
    eventData: NotificationInputUserRegistered
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_USER_REGISTERED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationPayloadBuilder.buildUserRegisteredNotificationPayload(
        eventData.triggeredBy,
        eventData.userID
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  public async userRemoved(
    eventData: NotificationInputUserRemoved
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_USER_REMOVED;
    this.logEventTriggered(eventData, event);

    const payload =
      this.notificationPayloadBuilder.buildUserRemovedNotificationPayload(
        eventData.triggeredBy,
        eventData.user
      );

    this.notificationsClient.emit<number>(event, payload);
  }

  private logEventTriggered(
    eventData: NotificationInputBase,
    eventType: NotificationEventType
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorizationMetaInfo(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.NOTIFICATIONS
    );
  }
}
