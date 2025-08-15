import { InAppNotificationPayloadUser } from './notification.in.app.payload.user.base';

export interface InAppNotificationPayloadUserMessageRoom
  extends InAppNotificationPayloadUser {
  messageID: string;
  roomID: string;
}
