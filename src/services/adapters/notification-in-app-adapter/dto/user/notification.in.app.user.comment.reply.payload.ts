import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';
import { InAppNotificationPayloadBaseMessage } from '../notification.in.app.payload.base.message';

export interface InAppNotificationUserCommentReplyPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_COMMENT_REPLY;
  originalMessage: InAppNotificationPayloadBaseMessage;
  replyMessage: InAppNotificationPayloadBaseMessage;
}
