import { Field, ObjectType } from '@nestjs/graphql';
import { NVP } from '@domain/common/nvp';
import { MembershipEcoverseResultEntry } from './membership.dto.result.ecoverse.entry';

@ObjectType()
export class Membership {
  @Field(() => [MembershipEcoverseResultEntry], {
    description: 'Names and IDs of the Ecoverses the user is a member of',
  })
  ecoverses: MembershipEcoverseResultEntry[] = [];

  @Field(() => [NVP], {
    description: 'Names and IDs of  the Organisaitons the user is a member of',
  })
  organisations: NVP[] = [];
}
