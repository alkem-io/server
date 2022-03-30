import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';

@ObjectType('Hub')
export abstract class IHub extends IBaseChallenge {
  challenges?: IChallenge[];

  template?: string;
}
