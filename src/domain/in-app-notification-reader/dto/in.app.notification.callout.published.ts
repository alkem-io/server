import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout';
import { InAppNotification } from './in.app.notification.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => InAppNotification,
})
export class InAppNotificationCalloutPublished extends InAppNotification {
  type!: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout that was published.',
  })
  callout!: ICallout;

  @Field(() => ISpace, {
    nullable: false,
    description: 'Where the callout is located.',
  })
  space!: ISpace;
}
