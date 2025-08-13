import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseMessage } from '../notification.in.app.payload.base.message';

export interface InAppNotificationUserMentionedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_MENTION;
  message: InAppNotificationPayloadBaseMessage;
}
