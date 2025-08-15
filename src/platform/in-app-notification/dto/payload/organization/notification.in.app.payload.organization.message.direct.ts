import { InAppNotificationPayloadOrganization } from './notification.in.app.payload.organization.base';

@ObjectType('InAppNotificationPayloadOrganizationMessageDirect')
export interface InAppNotificationPayloadOrganizationMessageDirect
  extends InAppNotificationPayloadOrganization {
  message: string;
}
