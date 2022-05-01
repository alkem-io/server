import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultCommunity } from './membership.dto.result.community';
import { MembershipResultContributorToHub } from './membership.dto.result.contributor.hub';

@ObjectType()
export class ContributorMembership {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [MembershipResultContributorToHub], {
    description:
      'Details of Hubs the user is a member of, with child memberships',
  })
  hubs: MembershipResultContributorToHub[] = [];

  @Field(() => [MembershipResultCommunity], {
    description: 'All the communitites the user is a part of.',
  })
  communities: MembershipResultCommunity[] = [];
}
