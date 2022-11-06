import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';

export interface ChallengeCreatedPayload extends BaseSubscriptionPayload {
  hubID: string;
  challenge: IChallenge;
}
