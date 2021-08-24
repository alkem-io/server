import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipUserResultEntryEcoverse extends MembershipResultEntry {
  @Field(() => String, {
    description: 'Parent ID (User ID)',
  })
  parentID: string;

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
    id: string,
    displayName: string,
    parentID: string
  ) {
    super(nameID, id, displayName);
    this.parentID = parentID;
  }
}
