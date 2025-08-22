import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputPlatformUserRegistered
  extends NotificationInputBase {
  userID: string;
}
