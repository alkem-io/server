import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export interface InAppNotificationPlatformUserProfileRemovedPayload
  extends InAppNotificationPayload {
  userDisplayName: string;
  userEmail: string;
}
