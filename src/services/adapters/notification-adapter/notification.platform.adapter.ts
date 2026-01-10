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
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { NotificationAdapter } from './notification.adapter';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.global.role.change';
import { InAppNotificationPayloadUser } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion';
import { InAppNotificationPayloadPlatformUserProfileRemoved } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.user.profile.removed';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';
import { NotificationUserAdapter } from './notification.user.adapter';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';

@Injectable()
export class NotificationPlatformAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  public async platformGlobalRoleChanged(
    eventData: NotificationInputPlatformGlobalRoleChange
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED;
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

    void this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadPlatformGlobalRoleChange = {
        type: NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE,
        userID: eventData.userID,
        roleName: eventData.role,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
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
    void this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const discussionURL =
        await this.urlGeneratorService.getForumDiscussionUrlPath(
          eventData.discussion.id
        );

      const inAppPayload: InAppNotificationPayloadPlatformForumDiscussion = {
        type: NotificationEventPayload.PLATFORM_FORUM_DISCUSSION,
        discussion: {
          id: eventData.discussion.id,
          displayName: eventData.discussion.profile.displayName,
          description: eventData.discussion.profile.description,
          url: discussionURL,
          category: eventData.discussion.category,
          roomID: eventData.discussion.comments.id,
        },
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async platformForumDiscussionComment(
    eventData: NotificationInputPlatformForumDiscussionComment
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData,
      eventData.userID
    );

    // Filter out the commenter from email recipients
    const emailRecipientsWithoutCommenter = recipients.emailRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );

    if (emailRecipientsWithoutCommenter.length > 0) {
      // build notification payload
      const payload =
        await this.notificationExternalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload(
          event,
          eventData.triggeredBy,
          emailRecipientsWithoutCommenter,
          eventData.discussion,
          eventData.commentSent
        );

      // send notification event
      void this.notificationExternalAdapter.sendExternalNotifications(
        event,
        payload
      );
    }

    // Send in-app notifications
    const inAppRecipientsWithoutCommenter = recipients.inAppRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    const inAppReceiverIDs = inAppRecipientsWithoutCommenter.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const discussionURL =
        await this.urlGeneratorService.getForumDiscussionUrlPath(
          eventData.discussion.id
        );

      const inAppPayload: InAppNotificationPayloadPlatformForumDiscussion = {
        type: NotificationEventPayload.PLATFORM_FORUM_DISCUSSION,
        discussion: {
          id: eventData.discussion.id,
          displayName: eventData.discussion.profile.displayName,
          description: eventData.discussion.profile.description,
          url: discussionURL,
          category: eventData.discussion.category,
          roomID: eventData.discussion.comments.id,
        },
        comment: {
          id: eventData.commentSent.id,
          message: eventData.commentSent.message,
        },
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
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

    void this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );
  }

  public async platformSpaceCreated(
    eventData: NotificationInputSpaceCreated
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED;
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
    void this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadSpace = {
        type: NotificationEventPayload.SPACE,
        spaceID: eventData.space.id,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
  }

  public async platformUserProfileCreated(
    eventData: NotificationInputPlatformUserRegistered
  ): Promise<void> {
    const adminEvent = NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED;
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
    void this.notificationExternalAdapter.sendExternalNotifications(
      adminEvent,
      adminPayload
    );

    // Send admin in-app notifications
    const adminInAppReceiverIDs = adminRecipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (adminInAppReceiverIDs.length > 0) {
      const adminInAppPayload: InAppNotificationPayloadUser = {
        type: NotificationEventPayload.USER,
        userID: eventData.userID,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        adminInAppReceiverIDs,
        adminInAppPayload
      );
    }

    // Send the new user welcome
    await this.notificationUserAdapter.userSignUpWelcome(eventData);
  }

  public async platformUserRemoved(
    eventData: NotificationInputPlatformUserRemoved
  ): Promise<void> {
    const event = NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED;
    const recipients = await this.getNotificationRecipientsPlatform(
      event,
      eventData
    );

    const payload =
      await this.notificationExternalAdapter.buildPlatformUserRemovedNotificationPayload(
        event,
        eventData.triggeredBy,
        recipients.emailRecipients,
        eventData.user
      );

    void this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );

    // Send in-app notifications
    const inAppReceiverIDs = recipients.inAppRecipients.map(
      recipient => recipient.id
    );
    if (inAppReceiverIDs.length > 0) {
      const inAppPayload: InAppNotificationPayloadPlatformUserProfileRemoved = {
        type: NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED,
        userDisplayName: eventData.user.profile.displayName,
        userEmail: eventData.user.email,
      };

      await this.notificationInAppAdapter.sendInAppNotifications(
        NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED,
        NotificationEventCategory.PLATFORM,
        eventData.triggeredBy,
        inAppReceiverIDs,
        inAppPayload
      );
    }
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
