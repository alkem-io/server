import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationUserMessageSenderPayload
  extends InAppNotificationAdditionalData {
  message: string;
  senderUserID: string;
}
