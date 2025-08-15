import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunicationMessageSenderPayload
  extends InAppNotificationAdditionalData {
  messageID: string;
}
