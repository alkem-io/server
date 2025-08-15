import { InAppNotificationPayloadUser } from './notification.in.app.payload.user.base';

export interface InAppNotificationPayloadUserMessageDirect
  extends InAppNotificationPayloadUser {
  message: string;
}
