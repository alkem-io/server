import { registerEnumType } from '@nestjs/graphql';
import { NotificationEventType as libEnum } from '@alkemio/notifications-lib';
import { compareEnums } from '@common/utils';

/**
 * When using the enum as a resolve value in GraphQL, you have to use the decorated value instead of the export by the lib type
 */
export enum NotificationEventType {
  COMMUNITY_APPLICATION_CREATED = 'communityApplicationCreated',
  COMMUNITY_NEW_MEMBER = 'communityNewMember',
  COMMUNITY_INVITATION_CREATED = 'communityInvitationCreated',
  COMMUNITY_PLATFORM_INVITATION_CREATED = 'communityPlatformInvitationCreated',
  COMMUNICATION_COMMENT_SENT = 'communicationCommentSent',
  COMMUNICATION_UPDATE_SENT = 'communicationUpdateSent',
  COMMUNICATION_COMMUNITY_MESSAGE = 'communicationCommunityMessage',
  COMMUNICATION_USER_MENTION = 'communicationUserMention',
  COLLABORATION_WHITEBOARD_CREATED = 'collaborationWhiteboardCreated',
  COLLABORATION_POST_CREATED = 'collaborationPostCreated',
  COLLABORATION_POST_COMMENT = 'collaborationPostComment',
  COLLABORATION_DISCUSSION_COMMENT = 'collaborationCommentOnDiscussion',
  COLLABORATION_CALLOUT_PUBLISHED = 'collaborationCalloutPublished',
  PLATFORM_USER_REGISTERED = 'platformUserRegistered',
  PLATFORM_USER_INVITED_TO_ROLE = 'platformUserInvitedToRole',
  PLATFORM_USER_REMOVED = 'platformUserRemoved',
  PLATFORM_GLOBAL_ROLE_CHANGE = 'platformGlobalRoleChange',
  PLATFORM_FORUM_DISCUSSION_COMMENT = 'platformForumDiscussionComment',
  PLATFORM_FORUM_DISCUSSION_CREATED = 'platformForumDiscussionCreated',
  PLATFORM_SPACE_CREATED = 'platformSpaceCreated',
  COMMENT_REPLY = 'commentReply',
  COMMUNITY_INVITATION_CREATED_VC = 'communityInvitationCreatedVC',
  ORGANIZATION_MESSAGE = 'organizationMessage',
  ORGANIZATION_MENTION = 'organizationMention',
  USER_MESSAGE = 'userMessage',
}

if (!compareEnums(NotificationEventType, libEnum)) {
  throw new Error('NotificationEventType enums mismatch');
}

registerEnumType(NotificationEventType, {
  name: 'NotificationEventType',
  description: 'The type of the notification',
});
