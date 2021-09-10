import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipCommunityResultEntry } from './membership.dto.community.result.entry';
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

  @Field(() => MembershipCommunityResultEntry, {
    description: 'The community that represents this ecoverse',
  })
  community: MembershipCommunityResultEntry;

  constructor(
    nameID: string,
    ecoverseID: string,
    displayName: string,
    userID: string,
    communityID: string
  ) {
    super(nameID, `${userID}/${ecoverseID}`, displayName);
    this.ecoverseID = ecoverseID;
    this.community = new MembershipCommunityResultEntry(
      communityID,
      displayName
    );
  }
}
