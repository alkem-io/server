import { LogContext } from '@common/enums/logging.context';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
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
      case NotificationEventPayload.PLATFORM_USER:
        return InAppNotificationPayloadPlatformUser;
      case NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED:
        return InAppNotificationPayloadPlatformUserProfileRemoved;
      case NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE:
        return InAppNotificationPayloadUser;
      case NotificationEventPayload.PLATFORM_SPACE_CREATED:
        return InAppNotificationPayloadSpace;

      // Organization notifications
      case NotificationEventPayload.ORGANIZATION_MESSAGE_SENDER:
        return InAppNotificationPayloadOrganizationMessageSender;
      case NotificationEventPayload.ORGANIZATION_MESSAGE_RECIPIENT:
        return InAppNotificationPayloadOrganizationMessageRecipient;
      case NotificationEventPayload.ORGANIZATION_MENTIONED:
        return InAppNotificationPayloadOrganizationMentioned;

      // Space notifications
      case NotificationEventPayload.SPACE_COMMUNITY_APPLICATION_ADMIN:
        return InAppNotificationPayloadSpaceCommunityApplicationAdmin;
      case NotificationEventPayload.SPACE_COMMUNITY_APPLICATION_APPLICANT:
        return InAppNotificationPayloadSpaceCommunityApplicationApplicant;
      case NotificationEventPayload.SPACE_COMMUNITY_NEW_MEMBER:
        return InAppNotificationPayloadSpaceCommunityNewMember;
      case NotificationEventPayload.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
        return InAppNotificationPayloadSpaceCommunityNewMemberAdmin;
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION_USER:
        return InAppNotificationPayloadSpaceCommunityInvitationUser;
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        return InAppNotificationPayloadSpaceCommunityInvitationUserPlatform;
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION_VC:
        return InAppNotificationPayloadSpaceCommunityInvitationVc;
      case NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_RECIPIENT:
        return InAppNotificationPayloadSpaceCommunicationMessageRecipient;
      case NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_SENDER:
        return InAppNotificationPayloadSpaceCommunicationMessageSender;
      case NotificationEventPayload.SPACE_COMMUNICATION_UPDATE:
        return InAppNotificationPayloadSpaceCommunicationUpdate;
      case NotificationEventPayload.SPACE_COMMUNICATION_UPDATE_ADMIN:
        return InAppNotificationPayloadSpaceCommunicationUpdateAdmin;
      case NotificationEventPayload.SPACE_COLLABORATION_POST_CREATED_ADMIN:
        return InAppNotificationPayloadSpaceCollaborationPostCreatedAdmin;
      case NotificationEventPayload.SPACE_COLLABORATION_POST_CREATED:
        return InAppNotificationPayloadSpaceCollaborationPostCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_POST_COMMENT_CREATED:
        return InAppNotificationPayloadSpaceCollaborationPostCommentCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_WHITEBOARD_CREATED:
        return InAppNotificationPayloadSpaceCollaborationWhiteboardCreated;
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        return InAppNotificationPayloadSpaceCollaborationCalloutPublished;

      // User notifications
      case NotificationEventPayload.USER_MENTION:
        return InAppNotificationPayloadUserMentioned;
      case NotificationEventPayload.USER_MESSAGE_SENDER:
        return InAppNotificationPayloadUserMessageSender;
      case NotificationEventPayload.USER_MESSAGE_RECIPIENT:
        return InAppNotificationPayloadUserMessageRecipient;
      case NotificationEventPayload.USER_COMMENT_REPLY:
        return InAppNotificationPayloadUserCommentReply;
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
  state!: NotificationEventInAppState;
  category!: NotificationEventCategory;
  type!: NotificationEvent;
  receiverID!: string;

  triggeredByID!: string;
  triggeredAt!: Date;

  payload!: InAppNotificationPayload;
}
