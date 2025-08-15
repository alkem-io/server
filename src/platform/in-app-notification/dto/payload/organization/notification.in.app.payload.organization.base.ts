import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export interface InAppNotificationPayloadOrganization
  extends InAppNotificationPayload {
  organizationID: string;
}
