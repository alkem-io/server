import { ActivityInputBase } from './activity.dto.input.base';
import { ISpace } from '@domain/challenge/space/space.interface';

export class ActivityInputChallengeCreated extends ActivityInputBase {
  subspace!: ISpace;
}
