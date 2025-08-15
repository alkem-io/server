import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationOrganizationMessageRecipientPayload
  extends InAppNotificationAdditionalData {
  messageID: string;
  messageContent: string;
}
