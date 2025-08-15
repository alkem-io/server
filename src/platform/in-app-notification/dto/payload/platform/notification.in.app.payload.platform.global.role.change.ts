import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export interface InAppNotificationPlatformGlobalRoleChangePayload
  extends InAppNotificationPayload {
  userID: string;
  roleName: string;
}
