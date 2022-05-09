import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResult as MembershipResult } from './membership.dto.result';

@ObjectType()
export class MembershipResultContributorToHub extends MembershipResult {
  @Field(() => String, {
    description: 'The Hub ID',
  })
  hubID: string;

  @Field(() => [MembershipResult], {
    description: 'Details of the Challenges the user is a member of',
  })
  challenges: MembershipResult[] = [];

  @Field(() => [MembershipResult], {
    description: 'Details of the Opportunities the Contributor is a member of',
  })
  opportunities: MembershipResult[] = [];

  @Field(() => [MembershipResult], {
    description: 'Details of the UserGroups the User is a member of',
  })
  userGroups: MembershipResult[] = [];

  constructor(
    nameID: string,
    hubID: string,
    displayName: string,
    userID: string
  ) {
    super(nameID, `${userID}/${hubID}`, displayName);
    this.hubID = hubID;
  }
}
