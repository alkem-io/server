import { Field, ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
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
  // fields resolved by a concrete resolver
  callout!: ICallout;
  space!: ISpace;
  // inherited, resolved by the interface resolvers
  category!: string;
  id!: string;
  state!: InAppNotificationState;
  triggeredAt!: Date;
  payload!: InAppNotificationPayload;
}
