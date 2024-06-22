import { ActivityInputBase } from './activity.dto.input.base';
import { ISpace } from '@domain/space/space/space.interface';

export class ActivityInputSubspaceCreated extends ActivityInputBase {
  subspace!: ISpace;
}
