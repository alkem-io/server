import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceCollaborationPostCreated
  extends InAppNotificationPayloadSpace {
  calloutID: string;
  postID: string;
}
