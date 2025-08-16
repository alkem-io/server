import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadBase', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayload {
  type!: NotificationEventPayload;
}
