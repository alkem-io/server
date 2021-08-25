import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipUserResultEntryOrganisation extends MembershipResultEntry {
  @Field(() => String, {
    description: 'The Organisation ID.',
  })
  organisationID: string;

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Organisations the user is a member of',
  })
  userGroups: MembershipResultEntry[] = [];

  constructor(
    nameID: string,
    organisationID: string,
    displayName: string,
    userID: string
  ) {
    super(nameID, `${userID}/${organisationID}`, displayName);
    this.organisationID = organisationID;
  }
}
