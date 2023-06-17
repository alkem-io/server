import { RoomType } from '@common/enums/room.type';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputEntityMention extends NotificationInputBase {
  comment: string;
  mentionedEntityID: string;
  commentsId: string;
  originEntity: {
    id: string;
    nameId: string;
    displayName: string;
  };
  commentType: RoomType;
}
