import { registerEnumType } from '@nestjs/graphql';

export enum HubPreferenceType {
  MEMBERSHIP_HOST_ORGANIZATION_MEMBERS_CAN_JOIN = 'MembershipHostOrganizationMembersCanJoin',
  MEMBERSHIP_HUB_MEMBERS_CAN_JOIN_CHALLENGES = 'MembershipHubMembersJoinChallenges',
  MEMBERSHIP_APPLICATIONS_ALLOWED = 'MembershipApplicationsAllowed',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
}

registerEnumType(HubPreferenceType, {
  name: 'HubPreferenceType',
});
