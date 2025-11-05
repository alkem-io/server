import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEvent', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEvent extends InAppNotificationPayloadSpaceBase {
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT;
  calendarEventID!: string;
}
