import { ISpace } from '@domain/space/space/space.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputSubspaceCreated extends ActivityInputBase {
  subspace!: ISpace;
}
