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
}

registerEnumType(UserPreferenceType, {
  name: 'UserPreferenceType',
});
