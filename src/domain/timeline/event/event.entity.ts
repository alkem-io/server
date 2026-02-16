import { CalendarEventType } from '@common/enums/calendar.event.type';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { Calendar } from '../calendar/calendar.entity';
import { ICalendarEvent } from './event.interface';

export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  type!: CalendarEventType;

  // toDo fix createdBy circular dependency https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/4529
  // @OneToOne(() => User, {
  //   eager: false,
  //   cascade: true,
  //   onDelete: 'SET NULL',
  // })
  // @JoinColumn()
  createdBy!: string;

  comments!: Room;

  calendar?: Calendar;

  startDate!: Date;

  wholeDay!: boolean;

  multipleDays!: boolean;

  durationMinutes!: number;

  durationDays?: number;

  visibleOnParentCalendar!: boolean;

  constructor() {
    super();
  }
}
