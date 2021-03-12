import { Field, ObjectType } from '@nestjs/graphql';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Ecoverse } from '@domain/challenge';

@ObjectType()
export class MemberOf {
  @Field(() => [UserGroup], {
    description:
      'References to the ecoverse with a populated list of groups the user is in at the ecoverse level',
  })
  ecoverses?: Ecoverse[];

  @Field(() => [Challenge], {
    description: 'References to the challenges the user is a member of',
  })
  challenges?: Challenge[];

  @Field(() => [Opportunity], {
    description: 'References to the opportunities the user is a member of',
  })
  opportunities?: Opportunity[];

  @Field(() => [Organisation], {
    description: 'References to the orgnaisaitons the user is a member of',
  })
  organisations?: Organisation[];
}
