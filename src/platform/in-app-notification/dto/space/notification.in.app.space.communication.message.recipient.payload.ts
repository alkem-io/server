import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunicationMessageRecipientPayload
  extends InAppNotificationAdditionalData {
  messageID: string;

  senderUserID: string;
}
