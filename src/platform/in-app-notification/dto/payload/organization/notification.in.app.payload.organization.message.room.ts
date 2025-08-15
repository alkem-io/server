import { InAppNotificationPayloadOrganization } from './notification.in.app.payload.organization.base';

export interface InAppNotificationPayloadOrganizationMessageRoom
  extends InAppNotificationPayloadOrganization {
  messageID: string;
  roomID: string;
}
