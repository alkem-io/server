import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipOrganizationResultEntryChallenge extends MembershipResultEntry {
  @Field(() => String, {
    description: 'The ID of the Hub hosting this Challenge.',
  })
  hubID = '';
}
