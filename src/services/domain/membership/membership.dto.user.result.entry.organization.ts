import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipUserResultEntryOrganization extends MembershipResultEntry {
  @Field(() => String, {
    description: 'The Organization ID.',
  })
  organizationID: string;

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Organizations the user is a member of',
  })
  userGroups: MembershipResultEntry[] = [];

  constructor(
    nameID: string,
    organizationID: string,
    displayName: string,
    userID: string
  ) {
    super(nameID, `${userID}/${organizationID}`, displayName);
    this.organizationID = organizationID;
  }
}
