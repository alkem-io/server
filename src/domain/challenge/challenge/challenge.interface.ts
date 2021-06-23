import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  ecoverseID!: string;
}
