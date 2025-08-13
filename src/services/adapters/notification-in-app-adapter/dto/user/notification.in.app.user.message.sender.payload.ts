import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';

export interface InAppNotificationUserMessageSenderPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_MESSAGE_SENDER;
  message: string;
  recipientUserID: string;
}
