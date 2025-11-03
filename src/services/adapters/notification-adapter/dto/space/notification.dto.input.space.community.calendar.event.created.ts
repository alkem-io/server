import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityCalendarEventCreated
  extends NotificationInputBase {
  calendarEvent: ICalendarEvent;
}
