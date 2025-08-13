import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseOrganization } from './notification.in.app.payload.base.organization';

export interface InAppNotificationOrganizationMessageSenderPayload
  extends InAppNotificationPayloadBaseOrganization {
  type: NotificationEvent.ORGANIZATION_MESSAGE_SENDER;
  messageID: string;
  messageContent: string;
}
