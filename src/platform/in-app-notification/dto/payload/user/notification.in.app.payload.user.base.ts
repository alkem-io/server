import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export interface InAppNotificationPayloadUser extends InAppNotificationPayload {
  userID: string;
}
