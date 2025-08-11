import { registerEnumType } from '@nestjs/graphql';

export enum NotificationEvent {
  // Platform notifications
  PLATFORM_FORUM_DISCUSSION_CREATED = 'platform-forumDiscussionCreated',
  PLATFORM_FORUM_DISCUSSION_COMMENT = 'platform-forumDiscussionComment',
  PLATFORM_USER_PROFILE_CREATED = 'platform-userProfileCreated',
  PLATFORM_USER_PROFILE_CREATED_ADMIN = 'platform-userProfileCreatedAdmin',
  PLATFORM_USER_PROFILE_REMOVED = 'platform-userProfileRemoved',
  PLATFORM_GLOBAL_ROLE_CHANGE = 'platform-globalRoleChange',
  PLATFORM_SPACE_CREATED = 'platform-spaceCreated',

  // Organization notifications
  ORGANIZATION_MESSAGE_SENDER = 'organization-messageSender',
  ORGANIZATION_MESSAGE_RECIPIENT = 'organization-messageRecipient',
  ORGANIZATION_MENTIONED = 'organization-mentioned',

  // Space notifications
  SPACE_COMMUNITY_APPLICATION_RECIPIENT = 'space-communityApplicationRecipient',
  SPACE_COMMUNITY_APPLICATION_APPLICANT = 'space-communityApplicationApplicant',
  SPACE_COMMUNITY_NEW_MEMBER = 'space-communityNewMember',
  SPACE_COMMUNITY_NEW_MEMBER_ADMIN = 'space-communityNewMemberAdmin',
  SPACE_COMMUNITY_INVITATION_USER = 'space-communityInvitationUser',
  SPACE_COMMUNITY_INVITATION_USER_PLATFORM = 'space-communityInvitationUserPlatform',
  SPACE_COMMUNITY_INVITATION_VC = 'space-communityInvitationVC',
  SPACE_CONTACT_MESSAGE_RECIPIENT = 'space-contactMessageRecipient',
  SPACE_CONTACT_MESSAGE_SENDER = 'space-contactMessageSender',
  SPACE_COMMUNICATION_UPDATE = 'space-communicationUpdate',
  SPACE_COMMUNICATION_UPDATE_ADMIN = 'space-communicationUpdateAdmin',
  SPACE_COMMUNICATION_MENTION = 'space-communicationMention',
  SPACE_POST_CREATED_ADMIN = 'space-postCreatedAdmin',
  SPACE_POST_CREATED = 'space-postCreated',
  SPACE_POST_COMMENT_CREATED = 'space-postCommentCreated',
  SPACE_WHITEBOARD_CREATED = 'space-whiteboardCreated',
  SPACE_CALLOUT_PUBLISHED = 'space-calloutPublished',

  // User notifications
  USER_MESSAGE_SENDER = 'user-messageSender',
  USER_MESSAGE_RECIPIENT = 'user-messageRecipient',
  USER_COMMENT_REPLY = 'user-commentReply',
}

registerEnumType(NotificationEvent, {
  name: 'NotificationEvent',
});
