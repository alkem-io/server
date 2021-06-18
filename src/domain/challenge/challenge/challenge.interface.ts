import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  @Field(() => [IOrganisation], {
    description: 'The Organisations that are leading this Challenge.',
  })
  leadOrganisations?: IOrganisation[];

  ecoverseID!: string;
}
