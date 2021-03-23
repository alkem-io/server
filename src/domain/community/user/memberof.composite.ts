import { Field, ObjectType } from '@nestjs/graphql';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Community } from '../community/community.entity';

@ObjectType()
export class MemberOf {
  @Field(() => [Community], {
    description: 'References to the Communities the user is a member of',
  })
  communities?: Community[];

  @Field(() => [Organisation], {
    description: 'References to the orgnaisaitons the user is a member of',
  })
  organisations?: Organisation[];
}
