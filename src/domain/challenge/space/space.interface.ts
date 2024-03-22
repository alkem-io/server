import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@ObjectType('Space')
export class ISpace extends IBaseChallenge {
  rowId!: number;

  challenges?: IChallenge[];
}
