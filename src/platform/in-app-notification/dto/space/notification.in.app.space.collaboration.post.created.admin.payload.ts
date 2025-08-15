import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCollaborationPostCreatedAdminPayload
  extends InAppNotificationAdditionalData {
  calloutID: string;
  postID: string;
}
