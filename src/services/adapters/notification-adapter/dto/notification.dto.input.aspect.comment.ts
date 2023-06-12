import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { NotificationInputBase } from './notification.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';

export interface NotificationInputAspectComment extends NotificationInputBase {
  aspect: IAspect;
  room: IRoom;
  commentSent: IMessage;
}
