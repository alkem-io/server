import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputPostCreated } from './dto/space/notification.dto.input.post.created';
import { NotificationInputCalloutPublished } from './dto/space/notification.dto.input.callout.published';
import { NotificationInputPostComment } from './dto/space/notification.dto.input.post.comment';
import { NotificationInputUpdateSent } from './dto/space/notification.dto.input.update.sent';
import { NotificationInputPlatformForumDiscussionCreated } from './dto/platform/notification.dto.input.platform.forum.discussion.created';
import { NotificationInputCommunityApplication } from './dto/space/notification.dto.input.community.application';
import { NotificationInputCommunityNewMember } from './dto/space/notification.dto.input.community.new.member';
import { NotificationInputPlatformUserRegistered } from './dto/platform/notification.dto.input.platform.user.registered';
import { NotificationInputPlatformUserRemoved } from './dto/platform/notification.dto.input.platform.user.removed';
import { NotificationInputWhiteboardCreated } from './dto/space/notification.dto.input.whiteboard.created';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { NotificationInputUserMessage } from './dto/user/notification.dto.input.user.message';
import { NotificationInputOrganizationMessage } from './dto/organization/notification.input.organization.message';
import { NotificationInputCommunityLeadsMessage } from './dto/space/notification.dto.input.community.leads.message';
import { NotificationInputEntityMention } from './dto/space/notification.dto.input.entity.mention';
import { NotificationInputEntityMentions } from './dto/space/notification.dto.input.entity.mentions';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { NotificationInputPlatformForumDiscussionComment } from './dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { NotificationInputCommunityInvitation } from './dto/space/notification.dto.input.community.invitation';
import { NotificationInputCommentReply } from './dto/space/notification.dto.input.comment.reply';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.platform.invitation';
import { NotificationInputPlatformGlobalRoleChange } from './dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationInputCommunityInvitationVirtualContributor } from './dto/space/notification.dto.input.community.invitation.vc';
import { NotificationInputSpaceCreated } from './dto/space/notification.dto.input.space.created';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { InAppNotificationCalloutPublishedPayload } from '../notification-in-app-adapter/dto/notification.in.app.callout.published.payload';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationsRecipientsService: NotificationRecipientsService,
    private notificationInAppAdapter: NotificationInAppAdapter
  ) {}

  public async SpaceCollaborationCalloutPublished(
    eventData: NotificationInputCalloutPublished
  ): Promise<void> {
    const event = NotificationEvent.SPACE_CALLOUT_PUBLISHED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCollaborationCalloutPublishedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.callout
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);

    // Send in-app notifications
    const inAppPayload: InAppNotificationCalloutPublishedPayload = {
      type: NotificationEvent.SPACE_CALLOUT_PUBLISHED,
      calloutID: eventData.callout.id,
      spaceID: payload.space.id,
      triggeredByID: eventData.triggeredBy,
      category: InAppNotificationCategory.MEMBER,
      triggeredAt: new Date(),
      receiverIDs: recipients.inAppRecipients.map(recipient => recipient.id),
    };

    await this.notificationInAppAdapter.decompressStoreNotify(inAppPayload);
  }

  public async spaceCollaborationPostCreated(
    eventData: NotificationInputPostCreated
  ): Promise<void> {
    const event = NotificationEvent.SPACE_POST_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpacePostCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCollaborationWhiteboardCreated(
    eventData: NotificationInputWhiteboardCreated
  ): Promise<void> {
    const event = NotificationEvent.SPACE_WHITEBOARD_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildSpaceWhiteboardCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCommunityNewMember(
    eventData: NotificationInputCommunityNewMember
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildCommunityNewMemberPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.contributorID,
        eventData.community
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCommunityApplicationCreated(
    eventData: NotificationInputCommunityApplication
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildApplicationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.community
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCommunityInvitationCreated(
    eventData: NotificationInputCommunityInvitation
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_USER;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildInvitationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.invitedContributorID,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCommunityInvitationVirtualContributorCreated(
    eventData: NotificationInputCommunityInvitationVirtualContributor
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_VC;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildInvitationVirtualContributorCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.invitedContributorID,
        eventData.accountHost,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceContactLeadsMessage(
    eventData: NotificationInputCommunityLeadsMessage
  ): Promise<void> {
    const event = NotificationEvent.SPACE_CONTACT_MESSAGE_RECIPIENT;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunicationLeadsMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.message,
        eventData.communityID
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCollaborationPostComment(
    eventData: NotificationInputPostComment
  ): Promise<void> {
    const event = NotificationEvent.SPACE_POST_COMMENT_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildCommentCreatedOnPostPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async spaceCommunicationUpdateSent(
    eventData: NotificationInputUpdateSent
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNICATION_UPDATE;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    // Send the notifications event
    const notificationsPayload =
      await this.notificationExternalAdapter.buildCommunicationUpdateSentNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.updates,
        eventData.lastMessage
      );
    this.notificationExternalAdapter.sendExternalNotification(
      event,
      notificationsPayload
    );
  }

  public async organizationMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_MENTIONED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildOrganizationMentionNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
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

  public async organizationSendMessage(
    eventData: NotificationInputOrganizationMessage
  ): Promise<void> {
    const event = NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildOrganizationMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.message,
        eventData.organizationID
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async userCommentReply(
    eventData: NotificationInputCommentReply
  ): Promise<void> {
    const event = NotificationEvent.USER_COMMENT_REPLY;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    try {
      // build notification payload
      const payload =
        await this.notificationExternalAdapter.buildUserCommentReplyPayload(
          event,
          eventData.triggeredBy,
          recipients.emailRecipients,
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

  public async userMessageSend(
    eventData: NotificationInputUserMessage
  ): Promise<void> {
    const event = NotificationEvent.USER_MESSAGE_RECIPIENT;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildUserMessageNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.receiverID,
        eventData.message
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async userMention(
    eventData: NotificationInputEntityMention
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNICATION_MENTION;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildUserMentionNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
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

  public async platformGlobalRoleChanged(
    eventData: NotificationInputPlatformGlobalRoleChange
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildGlobalRoleChangedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID,
        eventData.type,
        eventData.role
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformForumDiscussionCreated(
    eventData: NotificationInputPlatformForumDiscussionCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumDiscussionCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.discussion
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformForumDiscussionComment(
    eventData: NotificationInputPlatformForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    // build notification payload
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload(
        event,
        eventData.commentSent.sender,
        recipients.emailRecipients,
        eventData.discussion,
        eventData.commentSent
      );
    // send notification event
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformInvitationCreated(
    eventData: NotificationInputPlatformInvitation
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildExternalInvitationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.invitedUser,
        eventData.community,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformSpaceCreated(
    eventData: NotificationInputSpaceCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_SPACE_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformSpaceCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.community
      );
    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformUserRegistered(
    eventData: NotificationInputPlatformUserRegistered
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_CREATED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      await this.notificationExternalAdapter.buildUserRegisteredNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
  }

  public async platformUserRemoved(
    eventData: NotificationInputPlatformUserRemoved
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_REMOVED;
    const recipients = await this.getNotificationRecipients(
      event,
      eventData,
      eventData.callout.id
    );

    const payload =
      this.notificationExternalAdapter.buildPlatformUserRemovedNotificationPayload(
        eventData.triggeredBy,
        eventData.user,
        recipients.emailRecipients
      );

    this.notificationExternalAdapter.sendExternalNotification(event, payload);
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

  private async getNotificationRecipients(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    entityID: string
  ): Promise<NotificationRecipientResult> {
    this.logEventTriggered(eventData, event);

    const recipients = await this.notificationsRecipientsService.getRecipients({
      eventType: event,
      entityID,
    });
    return recipients;
  }

  private logEventTriggered(
    eventData: NotificationInputBase,
    eventType: NotificationEvent
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorizationMetaInfo(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.NOTIFICATIONS
    );
  }
}
