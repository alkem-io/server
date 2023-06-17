import { RoomType } from '@common/enums/room.type';
import { Mention } from '@domain/communication/messaging/mention.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputEntityMentions extends NotificationInputBase {
  comment: string;
  roomId: string;
  originEntity: {
    id: string;
    nameId: string;
    displayName: string;
  };
  commentType: RoomType;
  mentions: Mention[];
}
