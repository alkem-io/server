import { IUpdates } from '@domain/communication/updates/updates.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputUpdateSent extends NotificationInputBase {
  updates: IUpdates;
}
