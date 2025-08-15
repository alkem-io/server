import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceApplication
  extends InAppNotificationPayloadSpace {
  applicationID: string;
}
