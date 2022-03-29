import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IPreferenceSet } from '@domain/common/preference-set';

@ObjectType('Hub')
export abstract class IHub extends IBaseChallenge {
  challenges?: IChallenge[];

  preferenceSet?: IPreferenceSet;

  template?: string;
}
