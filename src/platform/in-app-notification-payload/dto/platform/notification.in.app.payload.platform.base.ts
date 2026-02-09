import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { Field } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

export abstract class InAppNotificationPayloadPlatformBase
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload;
}
