import { NVP } from '@domain/common/nvp';
import { Field, ObjectType } from '@nestjs/graphql';

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

  @Field(() => [NVP], {
    description: 'Names and IDs of the Challenges the user is a member of',
  })
  challenges: NVP[] = [];

  @Field(() => [NVP], {
    description: 'Names and IDs of  the UserGroups the user is a member of',
  })
  userGroups: NVP[] = [];
}
