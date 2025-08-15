import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCollaborationPostCommentCreatedPayload
  extends InAppNotificationAdditionalData {
  calloutID: string;
  postID: string;
  messageID: string;
}
