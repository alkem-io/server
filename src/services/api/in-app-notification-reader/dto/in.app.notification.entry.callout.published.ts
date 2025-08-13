import { ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCollaborationCalloutPublishedPayload } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.space.collaboration.callout.published.payload';

@ObjectType('InAppNotificationCalloutPublished', {
  implements: () => IInAppNotificationEntry,
})
export abstract class InAppNotificationEntryCalloutPublished extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED;
  declare payload: InAppNotificationSpaceCollaborationCalloutPublishedPayload;
  // fields resolved by a concrete resolver
  callout?: ICallout;
  space?: ISpace;
}
