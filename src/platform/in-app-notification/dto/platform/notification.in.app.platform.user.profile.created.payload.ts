import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformUserProfileCreatedPayload
  extends InAppNotificationAdditionalData {
  userID: string;
}
