import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipUserResultEntryOrganisation extends MembershipResultEntry {
  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Organisations the user is a member of',
  })
  userGroups: MembershipResultEntry[] = [];
}
