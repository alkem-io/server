import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class OrganisationMembership {
  @Field(() => [MembershipResultEntry], {
    description: 'Details of Ecoverses the Organisation is hosting.',
  })
  ecoversesHosting: MembershipResultEntry[] = [];

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Challenges the Organisation is leading.',
  })
  challengesLeading: MembershipResultEntry[] = [];
}
