import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadOrganization', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganization extends IInAppNotificationPayload {
  organizationID!: string;
}
