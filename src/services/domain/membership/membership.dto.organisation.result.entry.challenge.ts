import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipOrganisationResultEntryChallenge extends MembershipResultEntry {
  @Field(() => String, {
    description: 'The ID of the Ecoverse hosting this Challenge.',
  })
  ecoverseID = '';
}
