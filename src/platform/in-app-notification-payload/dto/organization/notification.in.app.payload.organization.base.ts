import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayload } from '../../in.app.notification.payload.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadOrganization', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganization extends InAppNotificationPayload {
  organizationID!: string;
}
