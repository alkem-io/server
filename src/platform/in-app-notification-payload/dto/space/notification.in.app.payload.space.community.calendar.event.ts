import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { Field, ObjectType } from '@nestjs/graphql';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEvent', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEvent extends InAppNotificationPayloadSpaceBase {
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT;

  @Field(() => UUID, {
    description: 'ID of the calendar event.',
  })
  calendarEventID!: string;

  @Field(() => String, {
    description: 'Display title of the calendar event.',
  })
  calendarEventTitle!: string;

  @Field(() => CalendarEventType, {
    description: 'Type of the calendar event.',
  })
  calendarEventType!: CalendarEventType;

  @Field(() => UUID, {
    description: 'ID of the user who created the event.',
  })
  createdBy!: string;
}
