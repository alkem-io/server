import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';

export interface InAppNotificationPayloadBaseOrganization
  extends InAppNotificationPayloadBase {
  organizationID: string;
}
