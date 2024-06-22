import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { ISpace } from '../space.interface';

export interface SubspaceCreatedPayload extends BaseSubscriptionPayload {
  spaceID: string;
  subspace: ISpace;
}
