import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputPlatformForumDiscussionCreated } from './dto/platform/notification.dto.input.platform.forum.discussion.created';
import { NotificationInputPlatformUserRegistered } from './dto/platform/notification.dto.input.platform.user.registered';
import { NotificationInputPlatformUserRemoved } from './dto/platform/notification.dto.input.platform.user.removed';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputPlatformForumDiscussionComment } from './dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationInputPlatformGlobalRoleChange } from './dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationInputSpaceCreated } from './dto/platform/notification.dto.input.platform.space.created';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { InAppNotificationPlatformForumDiscussionCreatedPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.forum.discussion.created.payload';
import { InAppNotificationPlatformUserProfileCreatedAdminPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.user.profile.created.admin.payload';
import { InAppNotificationPlatformUserProfileCreatedPayload } from '../notification-in-app-adapter/dto/platform/notification.in.app.platform.user.profile.created.payload';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationAdapter } from './notification.adapter';

@Injectable()
export class NotificationPlatformAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async platformGlobalRoleChanged(
    eventData: NotificationInputPlatformGlobalRoleChange
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformGlobalRoleChangedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID,
        eventData.type,
        eventData.role
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformForumDiscussionCreated(
    eventData: NotificationInputPlatformForumDiscussionCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );
    // Emit the events to notify others
    const payload =
      await this.notificationExternalAdapter.buildPlatformForumDiscussionCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.discussion
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPlatformForumDiscussionCreatedPayload =
        {
          type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.PLATFORM,
          triggeredAt: new Date(),
          discussionID: eventData.discussion.id,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }
  }

  public async platformForumDiscussionComment(
    eventData: NotificationInputPlatformForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
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
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformInvitationCreated(
    eventData: NotificationInputPlatformInvitation
  ): Promise<void> {
    const event = NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM;

    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        eventData.community.id
      );

    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload(
        event,
        eventData.triggeredBy,
        eventData.invitedUserEmail,
        space,
        eventData.welcomeMessage
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformSpaceCreated(
    eventData: NotificationInputSpaceCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_SPACE_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformSpaceCreatedPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.space
      );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  public async platformUserRegistered(
    eventData: NotificationInputPlatformUserRegistered
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_CREATED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData,
      eventData.userID
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformUserRegisteredNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.userID
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPlatformUserProfileCreatedPayload = {
        type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED,
        triggeredByID: eventData.triggeredBy,
        category: NotificationEventCategory.PLATFORM,
        triggeredAt: new Date(),
        userID: eventData.userID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        inAppPayload,
        inAppReceiverIDs
      );
    }

    // ALSO send admin notifications
    const adminEvent = NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN;
    const adminRecipients = await this.getNotificationRecipientsPlatform(
      adminEvent,
      eventData
    );

    const adminPayload =
      await this.notificationExternalAdapter.buildPlatformUserRegisteredNotificationPayload(
        adminEvent,
        eventData.triggeredBy,
        adminRecipients.emailRecipients,
        eventData.userID
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      adminEvent,
      adminPayload
    );

    // Send admin in-app notifications
    const adminInAppReceiverIDs = adminRecipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (adminInAppReceiverIDs.length > 0) {
      const adminInAppPayload: InAppNotificationPlatformUserProfileCreatedAdminPayload =
        {
          type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN,
          triggeredByID: eventData.triggeredBy,
          category: NotificationEventCategory.PLATFORM,
          triggeredAt: new Date(),
          userID: eventData.userID,
        };

      await this.notificationInAppAdapter.sendInAppNotifications(
        adminInAppPayload,
        adminInAppReceiverIDs
      );
    }
  }

  public async platformUserRemoved(
    eventData: NotificationInputPlatformUserRemoved
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_USER_PROFILE_REMOVED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      this.notificationExternalAdapter.buildPlatformUserRemovedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.user
      );

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  private async getNotificationRecipientsPlatform(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    userID?: string
  ): Promise<NotificationRecipientResult> {
    return this.notificationAdapter.getNotificationRecipients(
      event,
      eventData,
      undefined,
      userID
    );
  }
}
