import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCollaborationCalloutPublishedPayload
  extends InAppNotificationAdditionalData {
  calloutID: string;
}
