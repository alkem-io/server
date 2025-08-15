import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceCollaborationCalloutPublished
  extends InAppNotificationPayloadSpace {
  calloutID: string;
}
