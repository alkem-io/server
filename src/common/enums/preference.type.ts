import { registerEnumType } from '@nestjs/graphql';

export enum PreferenceType {
  // User entries
  NOTIFICATION_APPLICATION_RECEIVED = 'NotificationApplicationReceived',
  NOTIFICATION_APPLICATION_SUBMITTED = 'NotificationApplicationSubmitted',
  NOTIFICATION_COMMUNICATION_UPDATES = 'NotificationCommunityUpdates',
  NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN = 'NotificationCommunityUpdateSentAdmin',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED = 'NotificationCommunityDiscussionCreated',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN = 'NotificationCommunityDiscussionCreatedAdmin',
  NOTIFICATION_COMMUNICATION_DISCUSSION_RESPONSE = 'NotificationCommunityDiscussionResponse',
  NOTIFICATION_USER_SIGN_UP = 'NotificationUserSignUp',

  // Hub entries
  MEMBERSHIP_JOIN_HUB_FROM_ANYONE = 'MembershipJoinHubFromAnyone',
  MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinHubFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
}

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
