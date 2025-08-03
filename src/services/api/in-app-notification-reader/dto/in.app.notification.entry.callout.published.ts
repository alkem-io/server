import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCalloutPublishedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => IInAppNotificationEntry,
})
export abstract class InAppNotificationEntryCalloutPublished extends IInAppNotificationEntryBase {
  declare type: NotificationEventType.COLLABORATION_CALLOUT_PUBLISHED;
  declare payload: InAppNotificationCalloutPublishedPayload;
  // fields resolved by a concrete resolver
  callout?: ICallout;
  space?: ISpace;
}
