import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@ObjectType('InAppNotificationPayloadPlatformUser', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadVirtualContributor
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload;

  virtualContributorID!: string;
}
