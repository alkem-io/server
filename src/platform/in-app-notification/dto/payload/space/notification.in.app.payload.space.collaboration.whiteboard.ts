import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceCollaborationWhiteboardCreated
  extends InAppNotificationPayloadSpace {
  calloutID: string;
  whiteboardID: string;
}
