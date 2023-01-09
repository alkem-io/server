export enum CommunityPolicyFlag {
  ALLOW_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  MEMBERSHIP_JOIN_HUB_FROM_ANYONE = 'MembershipJoinHubFromAnyone',
  MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinHubFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'AllowMembersToCreateChallenges',
  ALLOW_MEMBERS_TO_CREATE_CALLOUTS = 'AllowMembersToCreateCallouts',

  MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS = 'MembershipJoinChallengeFromHubMembers',
  MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS = 'MembershipApplyChallengeFromHubMembers',
  MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT = 'MembershipFeedbackOnChallengeContext',

  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'AllowContributorsToCreateOpportunities',
  ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS = 'AllowContributorsToCreateCallouts',
  ALLOW_HUB_MEMBERS_TO_CONTRIBUTE = 'AllowHubMembersToContribute',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess',
}
