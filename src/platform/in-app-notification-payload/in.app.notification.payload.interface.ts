import { LogContext } from '@common/enums/logging.context';
import { Field, InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { InAppNotificationPayloadSpaceCommunityApplication } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.application';
import { InAppNotificationPayloadSpaceCommunityContributor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.contributor';
import { InAppNotificationPayloadSpaceCommunityInvitation } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation';
import { InAppNotificationPayloadSpaceCommunicationMessageDirect } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.message.direct';
import { InAppNotificationPayloadSpaceCollaborationCallout } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout';
import { InAppNotificationPayloadUser } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user';
import { InAppNotificationPayloadSpaceCommunicationUpdate } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.update';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.room';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';
import { InAppNotificationPayloadSpaceCommunityInvitationPlatform } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation.platform';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion';
import { InAppNotificationPayloadPlatformUserProfileRemoved } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.user.profile.removed';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.global.role.change';
import { InAppNotificationPayloadSpaceCollaborationCalloutPostComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.post.comment';
import { InAppNotificationPayloadVirtualContributor } from '@platform/in-app-notification-payload/dto/virtual-contributor/notification.in.app.payload.virtual.contributor';
import { InAppNotificationPayloadSpaceCollaborationCalloutComment } from '@platform/in-app-notification-payload/dto/space';
import { InAppNotificationPayloadSpaceCommunityCalendarEvent } from '@platform/in-app-notification-payload/dto/space';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space';

@InterfaceType('InAppNotificationPayload', {
  isAbstract: true,
  description: 'An in-app notification payload. To not be queried directly',
  resolveType(payload) {
    switch (payload.type) {
      // Platform notifications
      case NotificationEventPayload.PLATFORM_FORUM_DISCUSSION:
        return InAppNotificationPayloadPlatformForumDiscussion;
      case NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED:
        return InAppNotificationPayloadPlatformUserProfileRemoved;
      case NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE:
        return InAppNotificationPayloadPlatformGlobalRoleChange;

      // Organization notifications
      case NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT:
        return InAppNotificationPayloadOrganizationMessageDirect;
      case NotificationEventPayload.ORGANIZATION_MESSAGE_ROOM:
        return InAppNotificationPayloadOrganizationMessageRoom;

      // Space notifications
      case NotificationEventPayload.SPACE:
        return InAppNotificationPayloadSpace;
      case NotificationEventPayload.SPACE_COMMUNITY_APPLICATION:
        return InAppNotificationPayloadSpaceCommunityApplication;
      case NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR:
        return InAppNotificationPayloadSpaceCommunityContributor;
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION:
        return InAppNotificationPayloadSpaceCommunityInvitation;
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        return InAppNotificationPayloadSpaceCommunityInvitationPlatform;
      case NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT:
        return InAppNotificationPayloadSpaceCommunicationMessageDirect;
      case NotificationEventPayload.SPACE_COMMUNICATION_UPDATE:
        return InAppNotificationPayloadSpaceCommunicationUpdate;
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT:
        return InAppNotificationPayloadSpaceCollaborationCallout;
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_POST_COMMENT:
        return InAppNotificationPayloadSpaceCollaborationCalloutPostComment;
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_COMMENT:
        return InAppNotificationPayloadSpaceCollaborationCalloutComment;
      case NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT:
        return InAppNotificationPayloadSpaceCommunityCalendarEvent;
      case NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT:
        return InAppNotificationPayloadSpaceCommunityCalendarEventComment;

      // User notifications
      case NotificationEventPayload.USER:
        return InAppNotificationPayloadUser;
      case NotificationEventPayload.USER_MESSAGE_ROOM:
        return InAppNotificationPayloadUserMessageRoom;
      case NotificationEventPayload.USER_MESSAGE_DIRECT:
        return InAppNotificationPayloadUserMessageDirect;

      // Virtual Contributor notifications
      case NotificationEventPayload.VIRTUAL_CONTRIBUTOR:
        return InAppNotificationPayloadVirtualContributor;
    }

    throw new BaseException(
      'Unable to determine in-app notification type ' + payload.type,
      LogContext.IN_APP_NOTIFICATION,
      AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
      { id: payload.id, type: payload.type }
    );
  },
})
export class IInAppNotificationPayload {
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload;
}
