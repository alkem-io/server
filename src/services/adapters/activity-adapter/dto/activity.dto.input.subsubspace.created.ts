import { ISpace } from '@domain/space/space/space.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputSubsubspaceCreated extends ActivityInputBase {
  subsubspace!: ISpace;
  subspaceID!: string;
}
