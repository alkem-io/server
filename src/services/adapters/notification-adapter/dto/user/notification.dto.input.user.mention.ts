import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputUserMention extends NotificationInputBase {
  userID: string;
  roomID: string;
  messageID: string;
}
