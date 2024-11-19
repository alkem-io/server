import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => InAppNotification,
})
export abstract class InAppNotificationCalloutPublished
  implements InAppNotification
{
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
  // inherited
  category!: string;
  id!: string;
  state!: InAppNotificationState;
  triggeredAt!: Date;
}
