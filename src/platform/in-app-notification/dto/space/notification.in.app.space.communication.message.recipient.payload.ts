import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';
import { InAppNotificationPayloadBaseMessage } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base.message';

export interface InAppNotificationSpaceCommunicationMessageRecipientPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT;
  message: InAppNotificationPayloadBaseMessage;
}
