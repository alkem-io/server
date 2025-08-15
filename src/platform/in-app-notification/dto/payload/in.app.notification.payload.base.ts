import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayload', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayload {
  type!: NotificationEventPayload;
}
