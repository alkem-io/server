import { RoomType } from '@common/enums/room.type';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommentReply extends NotificationInputBase {
  reply: string;
  roomId: string;
  commentOwnerID: string;
  originEntity: {
    id: string;
    nameId: string;
    displayName: string;
  };
  commentType: RoomType;
}
