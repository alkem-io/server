import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadOrganization } from './notification.in.app.payload.organization.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadOrganizationMessageRoom', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganizationMessageRoom extends InAppNotificationPayloadOrganization {
  messageID!: string;
  roomID!: string;
}
