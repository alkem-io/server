import { registerEnumType } from '@nestjs/graphql';

export enum UserPreferenceType {
  NOTIFICATION_APPLICATION_RECEIVED = 'NotificationApplicationReceived',
  NOTIFICATION_APPLICATION_SUBMITTED = 'NotificationApplicationSubmitted',
  NOTIFICATION_COMMUNICATION_UPDATES = 'NotificationCommunityUpdates',
  NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN = 'NotificationCommunityUpdateSentAdmin',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED = 'NotificationCommunityDiscussionCreated',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN = 'NotificationCommunityDiscussionCreatedAdmin',
  NOTIFICATION_COMMUNICATION_DISCUSSION_RESPONSE = 'NotificationCommunityDiscussionResponse',
  NOTIFICATION_USER_SIGN_UP = 'NotificationUserSignUp',
  NOTIFICATION_USER_REMOVED = 'NotificationUserRemoved',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED = 'NotificationCommunityReviewSubmitted',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN = 'NotificationCommunityReviewSubmittedAdmin',
  NOTIFICATION_COMMUNITY_NEW_MEMBER = 'NotificationCommunityNewMember',
  NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN = 'NotificationCommunityNewMemberAdmin',
  NOTIFICATION_ASPECT_CREATED_ADMIN = 'NotificationAspectCreatedAdmin',
  NOTIFICATION_ASPECT_CREATED = 'NotificationAspectCreated',
  NOTIFICATION_ASPECT_COMMENT_CREATED = 'NotificationAspectCommentCreated',
  NOTIFICATION_CANVAS_CREATED = 'NotificationCanvasCreated',
  NOTIFICATION_DISCUSSION_COMMENT_CREATED = 'NotificationDiscussionCommentCreated',
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER = 'NotificationCommunityCollaborationInterestUser',
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN = 'NotificationCommunityCollaborationInterestAdmin',
  NOTIFICATION_CALLOUT_PUBLISHED = 'NotificationCalloutPublished',
}

registerEnumType(UserPreferenceType, {
  name: 'UserPreferenceType',
});
