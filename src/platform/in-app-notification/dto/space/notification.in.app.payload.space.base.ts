import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPayloadBaseSpace
  extends InAppNotificationPayloadBase {
  spaceID: string;
}
