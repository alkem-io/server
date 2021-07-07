import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
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

  @Field(() => [ApplicationResultEntry], {
    nullable: true,
    description: 'Open applications for this user.',
  })
  applications: ApplicationResultEntry[] = [];
}
