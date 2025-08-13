import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseOrganization } from './notification.in.app.payload.base.organization';

export interface InAppNotificationOrganizationMessageRecipientPayload
  extends InAppNotificationPayloadBaseOrganization {
  type: NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT;
  messageID: string;
  messageContent: string;
}
