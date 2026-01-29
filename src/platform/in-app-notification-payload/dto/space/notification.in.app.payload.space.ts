import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

@ObjectType('InAppNotificationPayloadSpace', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpace
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload.SPACE;

  spaceID!: string;
}
