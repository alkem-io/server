import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.global.role.change';
import { InAppNotificationPayloadPlatformUserProfileRemoved } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.user.profile.removed';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';
import { InAppNotificationPayloadUser } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationPushAdapter } from '../notification-push-adapter/notification.push.adapter';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { NotificationInputPlatformForumDiscussionComment } from './dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { NotificationInputPlatformForumDiscussionCreated } from './dto/platform/notification.dto.input.platform.forum.discussion.created';
import { NotificationInputPlatformGlobalRoleChange } from './dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationInputSpaceCreated } from './dto/platform/notification.dto.input.platform.space.created';
import { NotificationInputPlatformUserRegistered } from './dto/platform/notification.dto.input.platform.user.registered';
import { NotificationInputPlatformUserRemoved } from './dto/platform/notification.dto.input.platform.user.removed';
import { NotificationInputPlatformInvitation } from './dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationAdapter } from './notification.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';

@Injectable()
export class NotificationPlatformAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationAdapter: NotificationAdapter,
    private notificationExternalAdapter: NotificationExternalAdapter,
    private notificationInAppAdapter: NotificationInAppAdapter,
    private notificationPushAdapter: NotificationPushAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService,
    private urlGeneratorService: UrlGeneratorService,
    private userLookupService: UserLookupService
  ) {}

  private async getTriggeredByDisplayName(
    triggeredById: string
  ): Promise<string> {
    try {
      const user = await this.userLookupService.getUserByIdOrFail(
        triggeredById,
        {
          relations: { profile: true },
        }
      );
      return user?.profile?.displayName ?? 'Someone';
    } catch {
      return 'Someone';
    }
  }

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

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

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

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'Role changed',
          body: 'Your platform role has been updated',
          url: '/',
        }
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
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

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

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      const actorName = await this.getTriggeredByDisplayName(
        eventData.triggeredBy
      );
      const discussionName =
        eventData.discussion?.profile?.displayName ?? 'a discussion';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: `New discussion: ${discussionName}`,
          body: `${actorName} started a new forum discussion`,
          url: await this.urlGeneratorService.getForumDiscussionUrlPath(
            eventData.discussion.id
          ),
        }
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
      this.notificationExternalAdapter.sendExternalNotifications(
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

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      const actorName = await this.getTriggeredByDisplayName(
        eventData.triggeredBy
      );
      const discussionName =
        eventData.discussion?.profile?.displayName ?? 'a discussion';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: `Comment on ${discussionName}`,
          body: `${actorName} commented on a discussion`,
          url: await this.urlGeneratorService.getForumDiscussionUrlPath(
            eventData.discussion.id
          ),
        }
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

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
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
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

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

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      const actorName = await this.getTriggeredByDisplayName(
        eventData.triggeredBy
      );
      const spaceName =
        eventData.space.about?.profile?.displayName ?? 'New space';
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: `New space: ${spaceName}`,
          body: `${actorName} created a new space`,
          url: await this.urlGeneratorService.getSpaceUrlPathByID(
            eventData.space.id
          ),
        }
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
    this.notificationExternalAdapter.sendExternalNotifications(
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

    // Send admin push notifications
    const adminPushRecipientsFiltered = adminRecipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (adminPushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        adminPushRecipientsFiltered,
        adminEvent,
        {
          title: 'New user registered',
          body: 'A new user profile has been created on the platform',
          url: '/',
        }
      );
    }
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

    this.notificationExternalAdapter.sendExternalNotifications(event, payload);

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

    // Send push notifications
    const pushRecipientsFiltered = recipients.pushRecipients.filter(
      recipient => recipient.id !== eventData.triggeredBy
    );
    if (pushRecipientsFiltered.length > 0) {
      await this.notificationPushAdapter.sendPushNotifications(
        pushRecipientsFiltered,
        event,
        {
          title: 'User profile removed',
          body: 'A user profile has been removed from the platform',
          url: '/',
        }
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
