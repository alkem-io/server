import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { CalendarEvent } from '../event/event.entity';
import { ICalendar } from './calendar.interface';

export class Calendar extends AuthorizableEntity implements ICalendar {
  events?: CalendarEvent[];
}
