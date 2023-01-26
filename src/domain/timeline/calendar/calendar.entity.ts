import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, OneToMany } from 'typeorm';
import { CalendarEvent } from '../event/event.entity';
import { ICalendar } from './calendar.interface';

@Entity()
export class Calendar extends AuthorizableEntity implements ICalendar {
  @OneToMany(() => CalendarEvent, event => event.calendar, {
    eager: true,
    cascade: true,
  })
  events?: CalendarEvent[];
}
