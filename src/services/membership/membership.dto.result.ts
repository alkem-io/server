import { Field, ObjectType } from '@nestjs/graphql';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Ecoverse, IEcoverse } from '@domain/challenge/ecoverse';
import { IOrganisation } from '@domain/community/organisation';
import { Challenge, IChallenge } from '@domain/challenge';
import { IUserGroup, UserGroup } from '@domain/community/user-group';

@ObjectType()
export class Membership {
  @Field(() => [Ecoverse], {
    description: 'References to the Ecoverses the user is a member of',
  })
  ecoverses: IEcoverse[] = [];

  @Field(() => [Organisation], {
    description: 'References to the Organisaitons the user is a member of',
  })
  organisations: IOrganisation[] = [];

  @Field(() => [Challenge], {
    description: 'References to the Challenges the user is a member of',
  })
  challenges: IChallenge[] = [];

  @Field(() => [UserGroup], {
    description: 'References to the UserGroups the user is a member of',
  })
  userGroups: IUserGroup[] = [];
}
