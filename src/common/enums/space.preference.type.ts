import { registerEnumType } from '@nestjs/graphql';

export enum SpacePreferenceType {
  MEMBERSHIP_JOIN_SPACE_FROM_ANYONE = 'MembershipJoinSpaceFromAnyone',
  MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinSpaceFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'AllowMembersToCreateChallenges',
  ALLOW_MEMBERS_TO_CREATE_CALLOUTS = 'AllowMembersToCreateCallouts',
}

registerEnumType(SpacePreferenceType, {
  name: 'SpacePreferenceType',
});
