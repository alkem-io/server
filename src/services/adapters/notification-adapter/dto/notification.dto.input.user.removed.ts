import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputUserRemoved extends NotificationInputBase {
  userID: string;
}
