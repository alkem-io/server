import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationResult } from './membership.dto.result.user.application';
import { ContributorMembership } from './membership.dto.result.contributor';
import { MembershipResultUserinOrganization } from './membership.dto.result.user.organization';

@ObjectType()
export class UserMembership extends ContributorMembership {
  @Field(() => [MembershipResultUserinOrganization], {
    description:
      'Details of the Organizations the user is a member of, with child memberships.',
  })
  organizations: MembershipResultUserinOrganization[] = [];

  @Field(() => [ApplicationResult], {
    nullable: true,
    description: 'Open applications for this user.',
  })
  applications: ApplicationResult[] = [];
}
