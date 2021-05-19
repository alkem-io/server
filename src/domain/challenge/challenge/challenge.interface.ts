import { IOrganisation } from '@domain/community';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge';

@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  @Field(() => [IOrganisation], {
    description: 'The Organisations that are leading this Challenge.',
  })
  leadOrganisations?: IOrganisation[];
}
