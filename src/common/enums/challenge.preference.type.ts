import { registerEnumType } from '@nestjs/graphql';

export enum ChallengePreferenceType {
  MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS = 'MembershipJoinChallengeFromHubMembers',
  MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS = 'MembershipApplyChallengeFromHubMembers',
  MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT = 'MembershipFeedbackOnChallengeContext',
  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'AllowContributorsToCreateOpportunities',
  ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS = 'AllowContributorsToCreateCallouts',
  ALLOW_HUB_MEMBERS_TO_CONTRIBUTE = 'AllowHubMembersToContribute',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess',
}

registerEnumType(ChallengePreferenceType, {
  name: 'ChallengePreferenceType',
});
