import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipEcoverseResultEntry } from './membership.dto.result.ecoverse.entry';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class Membership {
  @Field(() => [MembershipEcoverseResultEntry], {
    description: 'Ecoverses the user is a member of, with child memberships',
  })
  ecoverses: MembershipEcoverseResultEntry[] = [];

  @Field(() => [MembershipResultEntry], {
    description: 'Names and IDs of  the Organisations the user is a member of',
  })
  organisations: MembershipResultEntry[] = [];
}
