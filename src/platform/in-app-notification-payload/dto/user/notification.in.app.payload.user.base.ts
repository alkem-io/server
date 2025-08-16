import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@ObjectType('InAppNotificationPayloadPlatformUser', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUser
  implements IInAppNotificationPayload
{
  type!: NotificationEventPayload;
  userID!: string;
}
