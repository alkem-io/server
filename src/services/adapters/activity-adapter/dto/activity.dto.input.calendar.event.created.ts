import { ICalendar } from '@domain/timeline/calendar/calendar.interface';
import { ICalendarEvent } from '@domain/timeline/event';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalendarEventCreated extends ActivityInputBase {
  calendarEvent!: ICalendarEvent;
  calendar!: ICalendar;
}
