import { IMessage } from '@domain/communication/message/message.interface';
import { ActivityInputBase } from './activity.dto.input.base';
import { IRoom } from '@domain/communication/room/room.interface';

export class ActivityInputUpdateSent extends ActivityInputBase {
  updates!: IRoom;
  message!: IMessage;
}
