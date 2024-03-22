import { ObjectType } from '@nestjs/graphql';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
@ObjectType('Opportunity')
export abstract class IOpportunity extends IBaseChallenge {
  rowId!: number;

  challenge?: IChallenge;
}
