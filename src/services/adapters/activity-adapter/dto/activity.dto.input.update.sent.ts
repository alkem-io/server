import { IUpdates } from '@domain/communication/updates/updates.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputUpdateSent extends ActivityInputBase {
  updates!: IUpdates;
  message!: string;
}
