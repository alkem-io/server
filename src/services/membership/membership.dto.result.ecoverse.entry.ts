import { Field, ObjectType } from '@nestjs/graphql';
import { MembershipResultEntry } from './membership.dto.result.entry';

@ObjectType()
export class MembershipEcoverseResultEntry {
  @Field(() => String, {
    nullable: true,
    description: 'The name of the Ecoverse.',
  })
  name = '';

  @Field(() => String, {
    nullable: true,
    description: 'The ID of the Ecoverse',
  })
  id = '';

  @Field(() => [MembershipResultEntry], {
    description: 'Names and IDs of the Challenges the user is a member of',
  })
  challenges: MembershipResultEntry[] = [];

  @Field(() => [MembershipResultEntry], {
    description: 'Names and IDs of  the UserGroups the user is a member of',
  })
  userGroups: MembershipResultEntry[] = [];
}
