import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformGlobalRoleChangePayload
  extends InAppNotificationAdditionalData {
  userID: string;
  roleName: string;
}
