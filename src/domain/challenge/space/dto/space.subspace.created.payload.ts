import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { ISpace } from '../space.interface';

export interface SubspaceCreatedPayload extends BaseSubscriptionPayload {
  journeyID: string;
  childJourney: ISpace;
}
