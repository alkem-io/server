import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationUserMentionedPayload
  extends InAppNotificationAdditionalData {
  messageID: string;
  roomID: string;
}
