export enum CommunityPolicyFlag {
  ALLOW_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  MEMBERSHIP_JOIN_SPACE_FROM_ANYONE = 'MembershipJoinSpaceFromAnyone',
  MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinSpaceFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'AllowMembersToCreateChallenges',

  MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipJoinChallengeFromSpaceMembers',
  MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipApplyChallengeFromSpaceMembers',
  MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT = 'MembershipFeedbackOnChallengeContext',

  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'AllowContributorsToCreateOpportunities',
  ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS = 'AllowContributorsToCreateCallouts',
  ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE = 'AllowSpaceMembersToContribute',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess',
}
