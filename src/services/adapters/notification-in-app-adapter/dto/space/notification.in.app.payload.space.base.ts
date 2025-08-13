import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';

export interface InAppNotificationPayloadBaseSpace
  extends InAppNotificationPayloadBase {
  spaceID: string;
}
