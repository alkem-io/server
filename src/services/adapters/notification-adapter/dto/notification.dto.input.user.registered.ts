import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputUserRegistered extends NotificationInputBase {
  userID: string;
}
