import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputUpdateSent extends NotificationInputBase {
  updates: IRoom;
  lastMessage: IMessage;
}
