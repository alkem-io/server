import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationUserCommentReplyPayload
  extends InAppNotificationAdditionalData {
  originalMessageID: string;
  replyMessageID: string;
}
