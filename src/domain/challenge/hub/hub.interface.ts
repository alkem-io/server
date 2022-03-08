import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IPreference } from '@domain/common/preferences/preference.interface';

@ObjectType('Hub')
export abstract class IHub extends IBaseChallenge {
  challenges?: IChallenge[];

  preferences?: IPreference[];

  template?: string;
}
