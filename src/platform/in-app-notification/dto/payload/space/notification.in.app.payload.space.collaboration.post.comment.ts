import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationPayloadSpaceCollaborationPostCommentCreated
  extends InAppNotificationPayloadSpace {
  calloutID: string;
  postID: string;
  messageID: string;
}
