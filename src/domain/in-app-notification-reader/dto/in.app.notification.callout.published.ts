import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCalloutPublishedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from './in.app.notification.base';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => InAppNotification,
})
export abstract class InAppNotificationCalloutPublished extends InAppNotificationBase() {
  type!: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
  payload!: InAppNotificationCalloutPublishedPayload;
  // fields resolved by a concrete resolver
  callout!: ICallout;
  space!: ISpace;
}
