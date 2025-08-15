import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationUserMessageRecipientPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_MESSAGE_RECIPIENT;
  message: string;
  senderUserID: string;
}
