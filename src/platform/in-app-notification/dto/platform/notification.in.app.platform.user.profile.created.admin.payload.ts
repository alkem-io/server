import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformUserProfileCreatedAdminPayload
  extends InAppNotificationAdditionalData {
  userID: string;
}
