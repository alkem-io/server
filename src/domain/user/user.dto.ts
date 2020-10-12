import { Field, ObjectType } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { Organisation } from '../organisation/organisation.entity';
import { UserGroup } from '../user-group/user-group.entity';

@ObjectType()
export class MemberOf {
  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => [UserGroup], {
    description:
      'References to the groups the user is in at the ecoverse level',
  })
  groups?: UserGroup[];

  @Field(() => [Challenge], {
    description: 'References to the challenges the user is a member of',
  })
  challenges?: Challenge[];

  @Field(() => [Organisation], {
    description: 'References to the orgnaisaitons the user is a member of',
  })
  organisations?: Organisation[];
}
