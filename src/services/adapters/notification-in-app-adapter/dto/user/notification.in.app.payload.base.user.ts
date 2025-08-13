import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';

export interface InAppNotificationPayloadBaseUser
  extends InAppNotificationPayloadBase {
  userID: string;
}
