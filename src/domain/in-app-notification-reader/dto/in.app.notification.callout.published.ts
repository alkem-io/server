import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from './in.app.notification.base';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => InAppNotification,
})
// todo: implement InAppNotificationBase
export abstract class InAppNotificationCalloutPublished extends InAppNotificationBase {
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
