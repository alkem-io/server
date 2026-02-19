import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
@ObjectType('InAppNotificationPayloadVirtualContributor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadVirtualContributor
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload, {
    nullable: false,
    description: 'The payload type.',
  })
  type!: NotificationEventPayload.VIRTUAL_CONTRIBUTOR;

  virtualContributorID!: string;

  space!: ISpace;
}
