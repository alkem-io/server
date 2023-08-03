import { ICalendar } from '@domain/timeline/calendar/calendar.interface';
import { ActivityInputBase } from './activity.dto.input.base';
import { ICalendarEvent } from '@domain/timeline/event';

export class ActivityInputCalendarEventCreated extends ActivityInputBase {
  calendarEvent!: ICalendarEvent;
  calendar!: ICalendar;
}
