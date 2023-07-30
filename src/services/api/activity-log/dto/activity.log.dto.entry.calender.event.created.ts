import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { ICalendar } from '@domain/timeline/calendar/calendar.interface';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';

@ObjectType('ActivityLogEntryCalendarEventCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalendarEventCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICalendar, {
    nullable: false,
    description: 'The Calendar in which the CalendarEvent was created.',
  })
  calendar!: ICalendar;

  @Field(() => ICalendarEvent, {
    nullable: false,
    description: 'The CalendarEvent that was created.',
  })
  event!: ICalendarEvent;
}
