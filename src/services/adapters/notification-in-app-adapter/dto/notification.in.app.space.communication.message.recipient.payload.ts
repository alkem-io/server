import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCommunicationMessageRecipientPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COMMUNICATION_MESSAGE_RECIPIENT;
  messageID: string;
  messageContent: string;
  roomID: string;
}
