import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipUserResultEntryEcoverse extends MembershipResultEntry {
  @Field(() => String, {
    description: 'The Ecoverse ID',
  })
  ecoverseID: string;

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Challenges the user is a member of',
  })
  challenges: MembershipResultEntry[] = [];

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the Opportunities the user is a member of',
  })
  opportunities: MembershipResultEntry[] = [];

  @Field(() => [MembershipResultEntry], {
    description: 'Details of the UserGroups the user is a member of',
  })
  userGroups: MembershipResultEntry[] = [];

  constructor(
    nameID: string,
    ecoverseID: string,
    displayName: string,
    userID: string
  ) {
    super(nameID, `${userID}/${ecoverseID}`, displayName);
    this.ecoverseID = ecoverseID;
  }
}
