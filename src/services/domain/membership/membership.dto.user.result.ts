import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { MembershipUserResultEntryOrganisation } from './membership.dto.user.result.entry.organisation';

@ObjectType()
export class UserMembership {
  @Field(() => [MembershipUserResultEntryEcoverse], {
    description:
      'Details of Ecoverses the user is a member of, with child memberships',
  })
  ecoverses: MembershipUserResultEntryEcoverse[] = [];

  @Field(() => [MembershipUserResultEntryOrganisation], {
    description:
      'Details of the Organisations the user is a member of, with child memberships.',
  })
  organisations: MembershipUserResultEntryOrganisation[] = [];
}
