import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';
import { InAppNotificationPayloadBaseMessage } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base.message';

export interface InAppNotificationUserCommentReplyPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_COMMENT_REPLY;
  originalMessage: InAppNotificationPayloadBaseMessage;
  replyMessage: InAppNotificationPayloadBaseMessage;
}
