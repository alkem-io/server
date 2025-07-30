import { registerEnumType } from '@nestjs/graphql';

export enum PreferenceType {
  NOTIFICATION_APPLICATION_RECEIVED = 'NotificationApplicationReceived',
  NOTIFICATION_APPLICATION_SUBMITTED = 'NotificationApplicationSubmitted',
  NOTIFICATION_COMMUNICATION_UPDATES = 'NotificationCommunityUpdates',
  NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN = 'NotificationCommunityUpdateSentAdmin',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED = 'NotificationCommunityDiscussionCreated',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN = 'NotificationCommunityDiscussionCreatedAdmin',
  NOTIFICATION_COMMUNITY_NEW_MEMBER = 'NotificationCommunityNewMember',
  NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN = 'NotificationCommunityNewMemberAdmin',
  NOTIFICATION_COMMUNITY_INVITATION_USER = 'NotificationCommunityInvitationUser',
  NOTIFICATION_POST_CREATED_ADMIN = 'NotificationPostCreatedAdmin',
  NOTIFICATION_POST_CREATED = 'NotificationPostCreated',
  NOTIFICATION_POST_COMMENT_CREATED = 'NotificationPostCommentCreated',
  NOTIFICATION_WHITEBOARD_CREATED = 'NotificationWhiteboardCreated',
  NOTIFICATION_DISCUSSION_COMMENT_CREATED = 'NotificationDiscussionCommentCreated',
  NOTIFICATION_CALLOUT_PUBLISHED = 'NotificationCalloutPublished',
  NOTIFICATION_COMMUNICATION_MENTION = 'NotificationCommunicationMention',
  NOTIFICATION_COMMENT_REPLY = 'NotificationCommentReply',

  // No longer used
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER = 'NotificationCommunityCollaborationInterestUser',
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN = 'NotificationCommunityCollaborationInterestAdmin',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED = 'NotificationCommunityReviewSubmitted',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN = 'NotificationCommunityReviewSubmittedAdmin',

  // Covered in Organization settings
  NOTIFICATION_ORGANIZATION_MENTION = 'NotificationOrganizationMention',
  NOTIFICATION_ORGANIZATION_MESSAGE = 'NotificationOrganizationMessage',

  // Covered in Platform settings
  NOTIFICATION_USER_SIGN_UP = 'NotificationUserSignUp',
  NOTIFICATION_USER_REMOVED = 'NotificationUserRemoved',
  NOTIFICATION_FORUM_DISCUSSION_CREATED = 'NotificationForumDiscussionCreated',
  NOTIFICATION_FORUM_DISCUSSION_COMMENT = 'NotificationForumDiscussionComment',
}

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
