import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCalloutPublishedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from './in.app.notification.base';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => InAppNotification,
})
export abstract class InAppNotificationCalloutPublished extends InAppNotificationBase() {
  declare type: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
  declare payload: InAppNotificationCalloutPublishedPayload;
  // fields resolved by a concrete resolver
  callout?: ICallout;
  space?: ISpace;
}
