import { LogContext } from '@common/enums/logging.context';
import { InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { InAppNotificationPayload } from '@platform/in-app-notification/dto/payload/in.app.notification.payload.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification/dto/payload/space/notification.in.app.payload.space.base';

@InterfaceType('InAppNotificationPayload', {
  isAbstract: true,
  description: 'An in-app notification payload. To not be queried directly',
  resolveType(payload) {
    switch (payload.type) {
      // Platform notifications
      case NotificationEventPayload.PLATFORM_FORUM_DISCUSSION:
        return InAppNotificationPayloadPlatformForumDiscussion;
      case NotificationEventPayload.PLATFORM_FORUM_DISCUSSION_COMMENT:
        return InAppNotificationPayloadPlatformForumDiscussionComment;
      case NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED:
        return InAppNotificationPayloadPlatformUserProfileRemoved;
      case NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE:
        return InAppNotificationPayloadUser;

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
        return InAppNotificationPayloadSpaceCommunityInvitationUserPlatform;
      case NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT:
        return InAppNotificationPayloadSpaceCommunicationMessageDirect;
      case NotificationEventPayload.SPACE_COMMUNICATION_UPDATE:
        return InAppNotificationPayloadSpaceCommunicationUpdate;
      case NotificationEventPayload.SPACE_COLLABORATION_POST:
        return InAppNotificationPayloadSpaceCollaborationPostCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_POST_COMMENT:
        return InAppNotificationPayloadSpaceCollaborationPostCommentCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_WHITEBOARD:
        return InAppNotificationPayloadSpaceCollaborationWhiteboardCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        return InAppNotificationPayloadSpaceCollaborationCalloutPublished;

      // User notifications
      case NotificationEventPayload.USER:
        return InAppNotificationPayloadPlatformUser;
      case NotificationEventPayload.USER_MESSAGE_ROOM:
        return InAppNotificationPayloadUserMessageRoom;
      case NotificationEventPayload.USER_MESSAGE_DIRECT:
        return InAppNotificationPayloadUserMessageDirect;
    }

    throw new BaseException(
      'Unable to determine in-app notification type',
      LogContext.IN_APP_NOTIFICATION,
      AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
      { id: payload.id, type: payload.type }
    );
  },
})
export abstract class IInAppNotificationPayload {
  payload!: InAppNotificationPayload;
}
