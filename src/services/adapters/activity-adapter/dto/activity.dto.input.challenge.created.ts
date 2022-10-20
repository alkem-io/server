import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputChallengeCreated extends ActivityInputBase {
  challenge!: IChallenge;
}
