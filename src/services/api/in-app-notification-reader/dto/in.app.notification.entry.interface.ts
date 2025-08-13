import { LogContext } from '@common/enums/logging.context';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { Field, InterfaceType } from '@nestjs/graphql';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

// Space notifications
import { InAppNotificationEntrySpaceCommunityNewMember } from './space/in.app.notification.entry.space.community.new.member';
import { InAppNotificationEntrySpaceCommunityNewMemberAdmin } from './space/in.app.notification.entry.space.community.new.member.admin';
import { InAppNotificationEntrySpaceCommunityApplicationAdmin } from './space/in.app.notification.entry.space.community.application.admin';
import { InAppNotificationEntrySpaceCommunityApplicationApplicant } from './space/in.app.notification.entry.space.community.application.applicant';
import { InAppNotificationEntrySpaceCommunityInvitationUser } from './space/in.app.notification.entry.space.community.invitation.user';
import { InAppNotificationEntrySpaceCommunityInvitationUserPlatform } from './space/in.app.notification.entry.space.community.invitation.user.platform';
import { InAppNotificationEntrySpaceCommunityInvitationVc } from './space/in.app.notification.entry.space.community.invitation.vc';
import { InAppNotificationEntrySpaceCommunicationMessageRecipient } from './space/in.app.notification.entry.space.communication.message.recipient';
import { InAppNotificationEntrySpaceCommunicationMessageSender } from './space/in.app.notification.entry.space.communication.message.sender';
import { InAppNotificationEntrySpaceCommunicationUpdate } from './space/in.app.notification.entry.space.communication.update';
import { InAppNotificationEntrySpaceCommunicationUpdateAdmin } from './space/in.app.notification.entry.space.communication.update.admin';
import { InAppNotificationEntrySpaceCollaborationPostCreated } from './space/in.app.notification.entry.space.collaboration.post.created';
import { InAppNotificationEntrySpaceCollaborationPostCreatedAdmin } from './space/in.app.notification.entry.space.collaboration.post.created.admin';
import { InAppNotificationEntrySpaceCollaborationPostCommentCreated } from './space/in.app.notification.entry.space.collaboration.post.comment.created';
import { InAppNotificationEntrySpaceCollaborationWhiteboardCreated } from './space/in.app.notification.entry.space.collaboration.whiteboard.created';
import { InAppNotificationEntrySpaceCollaborationCalloutPublished } from './space/in.app.notification.entry.space.collaboration.callout.published';

// Platform notifications
import { InAppNotificationEntryPlatformForumDiscussionCreated } from './platform/in.app.notification.entry.platform.forum.discussion.created';
import { InAppNotificationEntryPlatformForumDiscussionComment } from './platform/in.app.notification.entry.platform.forum.discussion.comment';
import { InAppNotificationEntryPlatformUserProfileCreated } from './platform/in.app.notification.entry.platform.user.profile.created';
import { InAppNotificationEntryPlatformUserProfileCreatedAdmin } from './platform/in.app.notification.entry.platform.user.profile.created.admin';
import { InAppNotificationEntryPlatformUserProfileRemoved } from './platform/in.app.notification.entry.platform.user.profile.removed';
import { InAppNotificationEntryPlatformGlobalRoleChange } from './platform/in.app.notification.entry.platform.global.role.change';
import { InAppNotificationEntryPlatformSpaceCreated } from './platform/in.app.notification.entry.platform.space.created';

// Organization notifications
import { InAppNotificationEntryOrganizationMessageSender } from './organization/in.app.notification.entry.organization.message.sender';
import { InAppNotificationEntryOrganizationMessageRecipient } from './organization/in.app.notification.entry.organization.message.recipient';
import { InAppNotificationEntryOrganizationMentioned } from './organization/in.app.notification.entry.organization.mentioned';

// User notifications
import { InAppNotificationEntryUserMentioned } from './user/in.app.notification.entry.user.mentioned';
import { InAppNotificationEntryUserMessageSender } from './user/in.app.notification.entry.user.message.sender';
import { InAppNotificationEntryUserMessageRecipient } from './user/in.app.notification.entry.user.message.recipient';
import { InAppNotificationEntryUserCommentReply } from './user/in.app.notification.entry.user.comment.reply';

@InterfaceType('InAppNotification', {
  isAbstract: true,
  description: 'An in-app notification type. To not be queried directly',
  resolveType(inAppNotification) {
    switch (inAppNotification.type) {
      // Platform notifications
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED:
        return InAppNotificationEntryPlatformForumDiscussionCreated;
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
        return InAppNotificationEntryPlatformForumDiscussionComment;
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
        return InAppNotificationEntryPlatformUserProfileCreated;
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN:
        return InAppNotificationEntryPlatformUserProfileCreatedAdmin;
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED:
        return InAppNotificationEntryPlatformUserProfileRemoved;
      case NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE:
        return InAppNotificationEntryPlatformGlobalRoleChange;
      case NotificationEvent.PLATFORM_SPACE_CREATED:
        return InAppNotificationEntryPlatformSpaceCreated;

      // Organization notifications
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
        return InAppNotificationEntryOrganizationMessageSender;
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT:
        return InAppNotificationEntryOrganizationMessageRecipient;
      case NotificationEvent.ORGANIZATION_MENTIONED:
        return InAppNotificationEntryOrganizationMentioned;

      // Space notifications
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN:
        return InAppNotificationEntrySpaceCommunityApplicationAdmin;
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
        return InAppNotificationEntrySpaceCommunityApplicationApplicant;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
        return InAppNotificationEntrySpaceCommunityNewMember;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
        return InAppNotificationEntrySpaceCommunityNewMemberAdmin;
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
        return InAppNotificationEntrySpaceCommunityInvitationUser;
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        return InAppNotificationEntrySpaceCommunityInvitationUserPlatform;
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_VC:
        return InAppNotificationEntrySpaceCommunityInvitationVc;
      case NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT:
        return InAppNotificationEntrySpaceCommunicationMessageRecipient;
      case NotificationEvent.SPACE_COMMUNICATION_MESSAGE_SENDER:
        return InAppNotificationEntrySpaceCommunicationMessageSender;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        return InAppNotificationEntrySpaceCommunicationUpdate;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
        return InAppNotificationEntrySpaceCommunicationUpdateAdmin;
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN:
        return InAppNotificationEntrySpaceCollaborationPostCreatedAdmin;
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED:
        return InAppNotificationEntrySpaceCollaborationPostCreated;
      case NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED:
        return InAppNotificationEntrySpaceCollaborationPostCommentCreated;
      case NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED:
        return InAppNotificationEntrySpaceCollaborationWhiteboardCreated;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        return InAppNotificationEntrySpaceCollaborationCalloutPublished;

      // User notifications
      case NotificationEvent.USER_MENTION:
        return InAppNotificationEntryUserMentioned;
      case NotificationEvent.USER_MESSAGE_SENDER:
        return InAppNotificationEntryUserMessageSender;
      case NotificationEvent.USER_MESSAGE_RECIPIENT:
        return InAppNotificationEntryUserMessageRecipient;
      case NotificationEvent.USER_COMMENT_REPLY:
        return InAppNotificationEntryUserCommentReply;
    }

    throw new BaseException(
      'Unable to determine in-app notification type',
      LogContext.IN_APP_NOTIFICATION,
      AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
      { id: inAppNotification.id, type: inAppNotification.type }
    );
  },
})
export abstract class IInAppNotificationEntry {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => NotificationEvent, {
    nullable: false,
    description: 'The type of the notification',
  })
  type!: NotificationEvent;

  @Field(() => Date, {
    nullable: false,
    description: 'When (UTC) was the notification sent.',
  })
  triggeredAt!: Date;

  @Field(() => NotificationEventInAppState, {
    nullable: false,
    description: 'The current state of the notification',
  })
  state!: NotificationEventInAppState;

  @Field(() => NotificationEventCategory, {
    nullable: false,
    description: 'Which category (role) is this notification targeted to.',
  })
  category!: NotificationEventCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
