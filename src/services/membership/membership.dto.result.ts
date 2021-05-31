import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntryEcoverse } from './membership.dto.result.entry.ecoverse';
import { MembershipResultEntryOrganisation } from './membership.dto.result.entry.organisation';

@ObjectType()
export class Membership {
  @Field(() => [MembershipResultEntryEcoverse], {
    description:
      'Details of Ecoverses the user is a member of, with child memberships',
  })
  ecoverses: MembershipResultEntryEcoverse[] = [];

  @Field(() => [MembershipResultEntryOrganisation], {
    description:
      'Details of the Organisations the user is a member of, with child memberships.',
  })
  organisations: MembershipResultEntryOrganisation[] = [];
}
