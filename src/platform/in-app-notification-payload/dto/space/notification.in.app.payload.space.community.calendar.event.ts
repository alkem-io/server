import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '../../in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEvent', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEvent extends InAppNotificationPayloadSpaceBase {
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT;
  calendarEventID!: string;
}
