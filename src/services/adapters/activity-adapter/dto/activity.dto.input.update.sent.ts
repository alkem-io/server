import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputUpdateSent extends ActivityInputBase {
  updates!: IRoom;
  message!: IMessage;
}
