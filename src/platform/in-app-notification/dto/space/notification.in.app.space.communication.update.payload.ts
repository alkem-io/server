import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunicationUpdatePayload
  extends InAppNotificationAdditionalData {
  updateID: string;
}
