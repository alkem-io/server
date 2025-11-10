import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { Field } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

export abstract class InAppNotificationPayloadUserBase
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload;

  userID!: string;
}
