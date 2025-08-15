import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationUserMessageRecipientPayload
  extends InAppNotificationAdditionalData {
  message: string;
  senderUserID: string;
}
