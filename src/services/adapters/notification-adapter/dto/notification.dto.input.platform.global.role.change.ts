import { RoleChangeType } from '@alkemio/notifications-lib';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputPlatformGlobalRoleChange
  extends NotificationInputBase {
  userID: string;
  type: RoleChangeType;
  role: string;
}
