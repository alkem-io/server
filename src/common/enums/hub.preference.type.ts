import { registerEnumType } from '@nestjs/graphql';

export enum HubPreferenceType {
  MEMBERSHIP_JOIN_HUB_FROM_ANYONE = 'MembershipJoinHubFromAnyone',
  MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinHubFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
}

registerEnumType(HubPreferenceType, {
  name: 'HubPreferenceType',
});
