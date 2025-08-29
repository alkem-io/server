import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommentReply extends NotificationInputBase {
  roomId: string;
  messageID: string;
  messageRepliedToOwnerID: string;
}
