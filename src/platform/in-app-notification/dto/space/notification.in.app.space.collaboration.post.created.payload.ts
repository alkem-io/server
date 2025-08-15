import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCollaborationPostCreatedPayload
  extends InAppNotificationAdditionalData {
  calloutID: string;
  postID: string;
}
