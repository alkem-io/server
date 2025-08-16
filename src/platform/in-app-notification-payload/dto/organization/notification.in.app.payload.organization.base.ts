import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadOrganization', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganization
  implements IInAppNotificationPayload
{
  type!: NotificationEventPayload;
  organizationID!: string;
}
