import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';
@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
  rowId!: number;
  opportunities?: IOpportunity[];
}
