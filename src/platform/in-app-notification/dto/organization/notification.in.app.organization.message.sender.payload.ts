import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationOrganizationMessageSenderPayload
  extends InAppNotificationAdditionalData {
  messageID: string;
  messageContent: string;
}
