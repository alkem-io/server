import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputUserMessage extends NotificationInputBase {
  message: string;
  receiverID: string;
}
