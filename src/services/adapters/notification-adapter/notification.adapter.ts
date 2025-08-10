import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputPostCreated } from './dto/notification.dto.input.post.created';
import { NotificationInputCalloutPublished } from './dto/notification.dto.input.callout.published';
import { NotificationInputPostComment } from './dto/notification.dto.input.post.comment';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { NotificationInputUpdateSent } from './dto/notification.dto.input.update.sent';
import { NotificationInputForumDiscussionCreated } from './dto/notification.dto.input.discussion.created';
import { NotificationInputCommunityApplication } from './dto/notification.dto.input.community.application';
import { NotificationInputCommunityNewMember } from './dto/notification.dto.input.community.new.member';
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
import { NotificationInputPlatformInvitation } from './dto/notification.dto.input.platform.invitation';
import { NotificationInputPlatformGlobalRoleChange } from './dto/notification.dto.input.platform.global.role.change';
import { NotificationInputCommunityInvitationVirtualContributor } from './dto/notification.dto.input.community.invitation.vc';
import { NotificationInputSpaceCreated } from './dto/notification.dto.input.space.created';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter
  ) {}

  public async calloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildCalloutPublishedPayload(
        eventData.triggeredBy,
        eventData.callout
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async postCreated(
    eventData: NotificationInputPostCreated
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_POST_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildPostCreatedPayload(eventData);

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async whiteboardCreated(
    eventData: NotificationInputWhiteboardCreated
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_WHITEBOARD_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildWhiteboardCreatedPayload(
        eventData
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async postComment(
    eventData: NotificationInputPostComment
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_POST_COMMENT;
    this.logEventTriggered(eventData, event);
    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildCommentCreatedOnPostPayload(
        eventData
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async discussionComment(
    eventData: NotificationInputDiscussionComment
  ): Promise<void> {
    const event = NotificationEventType.COLLABORATION_DISCUSSION_COMMENT;
    this.logEventTriggered(eventData, event);

    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildCommentCreatedOnDiscussionPayload(
        eventData.callout,
        eventData.comments.id,
        eventData.commentSent
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async forumDiscussionComment(
    eventData: NotificationInputForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_FORUM_DISCUSSION_COMMENT;
    this.logEventTriggered(eventData, event);

    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildCommentCreatedOnForumDiscussionPayload(
        eventData.discussion,
        eventData.commentSent
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async commentReply(
    eventData: NotificationInputCommentReply
  ): Promise<void> {
    const event = NotificationEventType.COMMENT_REPLY;
    this.logEventTriggered(eventData, event);

    try {
      // build notification payload
      const payload =
        await this.notificationExternalAdapter.buildCommentReplyPayload(
          eventData
        );
      // send notification event
      this.notificationExternalAdapter.sendExternalNotification(event, payload);
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
      await this.notificationExternalAdapter.buildCommunicationUpdateSentNotificationPayload(
        eventData.triggeredBy,
        eventData.updates,
        eventData.lastMessage
      );
    this.notificationExternalAdapter.sendExternalNotification(
      event,
      notificationsPayload
    );
  }

  public async forumDiscussionCreated(
    eventData: NotificationInputForumDiscussionCreated
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_FORUM_DISCUSSION_CREATED;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumDiscussionCreatedNotificationPayload(
        eventData.discussion
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async sendUserMessage(
    eventData: NotificationInputUserMessage
  ): Promise<void> {
    const event = NotificationEventType.USER_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildUserMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.receiverID,
        eventData.message
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async sendOrganizationMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEventType.ORGANIZATION_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.message,
        eventData.organizationID
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async sendCommunityLeadsMessage(
    eventData: NotificationInputCommunityLeadsMessage
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_COMMUNITY_MESSAGE;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildCommunicationCommunityLeadsMessageNotificationPayload(
        eventData.triggeredBy,
        eventData.message,
        eventData.communityID
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async userMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEventType.COMMUNICATION_USER_MENTION;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildCommunicationUserMentionNotificationPayload(
        eventData.triggeredBy,
        eventData.mentionedEntityID,
        eventData.comment,
        eventData.originEntity.id,
        eventData.originEntity.displayName,
        eventData.commentType
      );

    if (payload) {
      this.notificationExternalAdapter.sendExternalNotification(event, payload);
    }
  }

  public async organizationMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEventType.ORGANIZATION_MENTION;
    this.logEventTriggered(eventData, event);
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildOrganizationMentionNotificationPayload(
        eventData.triggeredBy,
        eventData.mentionedEntityID,
        eventData.comment,
        eventData.originEntity.id,
        eventData.originEntity.displayName,
        eventData.commentType
      );

    if (payload) {
      this.notificationExternalAdapter.sendExternalNotification(event, payload);
    }
  }

  public async entityMentions(
    eventData: NotificationInputEntityMentions
  ): Promise<void> {
    for (const mention of eventData.mentions) {
      const entityMentionNotificationInput: NotificationInputEntityMention = {
        triggeredBy: eventData.triggeredBy,
        comment: eventData.comment,
        mentionedEntityID: mention.id,
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
      await this.notificationExternalAdapter.buildApplicationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.triggeredBy,
        eventData.community
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async invitationCreated(
    eventData: NotificationInputCommunityInvitation
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_INVITATION_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildInvitationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.invitedContributorID,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async invitationVirtualContributorCreated(
    eventData: NotificationInputCommunityInvitationVirtualContributor
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_INVITATION_CREATED_VC;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildInvitationVirtualContributorCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.invitedContributorID,
        eventData.accountHost,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformInvitationCreated(
    eventData: NotificationInputPlatformInvitation
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_PLATFORM_INVITATION_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildExternalInvitationCreatedNotificationPayload(
        eventData.triggeredBy,
        eventData.invitedUser,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformSpaceCreated(
    eventData: NotificationInputSpaceCreated
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_SPACE_CREATED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildPlatformSpaceCreatedPayload(
        eventData.triggeredBy,
        eventData.community
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async communityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    const event = NotificationEventType.COMMUNITY_NEW_MEMBER;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildCommunityNewMemberPayload(
        eventData.triggeredBy,
        eventData.contributorID,
        eventData.community
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformGlobalRoleChanged(
    eventData: NotificationInputPlatformGlobalRoleChange
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_GLOBAL_ROLE_CHANGE;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildGlobalRoleChangedNotificationPayload(
        eventData.triggeredBy,
        eventData.userID,
        eventData.type,
        eventData.role
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async userRegistered(
    eventData: NotificationInputUserRegistered
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_USER_REGISTERED;
    this.logEventTriggered(eventData, event);

    const payload =
      await this.notificationExternalAdapter.buildUserRegisteredNotificationPayload(
        eventData.triggeredBy,
        eventData.userID
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async userRemoved(
    eventData: NotificationInputUserRemoved
  ): Promise<void> {
    const event = NotificationEventType.PLATFORM_USER_REMOVED;
    this.logEventTriggered(eventData, event);

    const payload =
      this.notificationExternalAdapter.buildUserRemovedNotificationPayload(
        eventData.triggeredBy,
        eventData.user
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
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
