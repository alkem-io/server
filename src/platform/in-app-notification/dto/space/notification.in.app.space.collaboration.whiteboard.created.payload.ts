import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCollaborationWhiteboardCreatedPayload
  extends InAppNotificationAdditionalData {
  calloutID: string;
  whiteboardID: string;
}
