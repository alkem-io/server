import { registerEnumType } from '@nestjs/graphql';

export enum UserNotificationEvent {
  // Platform notifications
  PLATFORM_FORUM_DISCUSSION_CREATED = 'platform-forumDiscussionCreated',
  PLATFORM_FORUM_DISCUSSION_COMMENT = 'platform-forumDiscussionComment',
  PLATFORM_NEW_USER_SIGN_UP = 'platform-newUserSignUp',
  PLATFORM_USER_PROFILE_REMOVED = 'platform-userProfileRemoved',
  PLATFORM_SPACE_CREATED = 'platform-spaceCreated',

  // Organization notifications
  ORGANIZATION_MESSAGE_RECEIVED = 'organization-messageReceived',
  ORGANIZATION_MENTIONED = 'organization-mentioned',

  // Space notifications
  SPACE_APPLICATION_RECEIVED = 'space-applicationReceived',
  SPACE_APPLICATION_SUBMITTED = 'space-applicationSubmitted',
  SPACE_COMMUNICATION_UPDATES = 'space-communicationUpdates',
  SPACE_COMMUNICATION_UPDATES_ADMIN = 'space-communicationUpdatesAdmin',
  SPACE_COMMUNITY_NEW_MEMBER = 'space-communityNewMember',
  SPACE_COMMUNITY_NEW_MEMBER_ADMIN = 'space-communityNewMemberAdmin',
  SPACE_COMMUNITY_INVITATION_USER = 'space-communityInvitationUser',
  SPACE_POST_CREATED_ADMIN = 'space-postCreatedAdmin',
  SPACE_POST_CREATED = 'space-postCreated',
  SPACE_POST_COMMENT_CREATED = 'space-postCommentCreated',
  SPACE_WHITEBOARD_CREATED = 'space-whiteboardCreated',
  SPACE_CALLOUT_PUBLISHED = 'space-calloutPublished',
  SPACE_COMMUNICATION_MENTION = 'space-communicationMention',
  SPACE_COMMENT_REPLY = 'space-commentReply',
}

registerEnumType(UserNotificationEvent, {
  name: 'UserNotificationEvent',
});
