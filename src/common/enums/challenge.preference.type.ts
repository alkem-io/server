import { registerEnumType } from '@nestjs/graphql';

export enum ChallengePreferenceType {
  MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipJoinChallengeFromSpaceMembers',
  MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipApplyChallengeFromSpaceMembers',
  MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT = 'MembershipFeedbackOnChallengeContext',
  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'AllowContributorsToCreateOpportunities',
  ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS = 'AllowContributorsToCreateCallouts',
  ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE = 'AllowSpaceMembersToContribute',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess',
}

registerEnumType(ChallengePreferenceType, {
  name: 'ChallengePreferenceType',
});
