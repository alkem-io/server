import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResult as MembershipResult } from './membership.dto.result';

@ObjectType()
export class MembershipResultUserinOrganization extends MembershipResult {
  @Field(() => String, {
    description: 'The Organization ID.',
  })
  organizationID: string;

  @Field(() => [MembershipResult], {
    description:
      'Details of the Groups in the Organizations the user is a member of',
  })
  userGroups: MembershipResult[] = [];

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
