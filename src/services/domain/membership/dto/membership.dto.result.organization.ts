import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResult } from './membership.dto.result';
import { MembershipResultChallengeLeading } from './membership.dto.result.challenge.leading';
import { ContributorMembership } from './membership.dto.result.contributor';

@ObjectType()
export class OrganizationMembership extends ContributorMembership {
  @Field(() => [MembershipResult], {
    description: 'Details of Hubs the Organization is hosting.',
  })
  hubsHosting: MembershipResult[] = [];

  @Field(() => [MembershipResultChallengeLeading], {
    description: 'Details of the Challenges the Organization is leading.',
  })
  challengesLeading: MembershipResultChallengeLeading[] = [];
}
