import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformUserProfileRemovedPayload
  extends InAppNotificationAdditionalData {
  userDisplayName: string;
  userEmail: string;
}
