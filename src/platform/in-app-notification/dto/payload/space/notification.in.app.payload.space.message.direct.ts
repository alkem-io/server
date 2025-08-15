import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceMessageDirect
  extends InAppNotificationPayloadSpace {
  message: string;
}
