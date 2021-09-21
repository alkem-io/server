import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { MembershipOrganizationResultEntryChallenge } from './membership.dto.organization.result.entry.challenge';

@ObjectType()
export class OrganizationMembership {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => [MembershipResultEntry], {
    description: 'Details of Ecoverses the Organization is hosting.',
  })
  ecoversesHosting: MembershipResultEntry[] = [];

  @Field(() => [MembershipOrganizationResultEntryChallenge], {
    description: 'Details of the Challenges the Organization is leading.',
  })
  challengesLeading: MembershipOrganizationResultEntryChallenge[] = [];
}
