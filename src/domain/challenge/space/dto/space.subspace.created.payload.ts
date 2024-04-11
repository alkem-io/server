import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { IJourney } from '@domain/challenge/base-challenge/journey.interface';

export interface SubspaceCreatedPayload extends BaseSubscriptionPayload {
  journeyID: string;
  childJourney: IJourney;
}
