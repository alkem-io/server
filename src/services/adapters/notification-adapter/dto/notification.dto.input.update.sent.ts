import { NotificationInputBase } from './notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';

export interface NotificationInputUpdateSent extends NotificationInputBase {
  updates: IRoom;
}
