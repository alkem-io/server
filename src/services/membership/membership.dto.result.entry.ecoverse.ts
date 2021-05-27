import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipResultEntryEcoverse extends MembershipResultEntry {
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
}
