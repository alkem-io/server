import { ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { InAppNotificationCalloutPublishedPayload } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.callout.published.payload';
import { NotificationEvent } from '@common/enums/notification.event';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => IInAppNotificationEntry,
})
export abstract class InAppNotificationEntryCalloutPublished extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_CALLOUT_PUBLISHED;
  declare payload: InAppNotificationCalloutPublishedPayload;
  // fields resolved by a concrete resolver
  callout?: ICallout;
  space?: ISpace;
}
