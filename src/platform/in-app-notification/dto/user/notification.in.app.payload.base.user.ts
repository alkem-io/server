import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPayloadBaseUser
  extends InAppNotificationPayloadBase {
  userID: string;
}
