import { NotificationInputBase } from '../notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';
import { IMessage } from '@domain/communication/message/message.interface';

export interface NotificationInputUpdateSent extends NotificationInputBase {
  updates: IRoom;
  lastMessage: IMessage;
}
