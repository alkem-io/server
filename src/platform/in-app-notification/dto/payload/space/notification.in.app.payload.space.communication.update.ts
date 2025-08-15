import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceCommunicationUpdate
  extends InAppNotificationPayloadSpace {
  updateID: string;
}
