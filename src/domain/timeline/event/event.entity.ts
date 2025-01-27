import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalendarEvent } from './event.interface';
import { Calendar } from '../calendar/calendar.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { Space } from '@domain/space/space/space.entity';

@Entity()
export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  @Column('varchar', { nullable: false, length: ENUM_LENGTH })
  type!: CalendarEventType;

  // toDo fix createdBy circular dependency https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/4529
  // @OneToOne(() => User, {
  //   eager: false,
  //   cascade: true,
  //   onDelete: 'SET NULL',
  // })
  // @JoinColumn()
  @Column('char', { length: UUID_LENGTH, nullable: false })
  createdBy!: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  @ManyToOne(() => Calendar, calendar => calendar.events, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  calendar?: Calendar;

  @Column('datetime', { nullable: false })
  startDate!: Date;

  @Column('boolean', { nullable: false })
  wholeDay!: boolean;

  @Column('boolean', { nullable: false })
  multipleDays!: boolean;

  @Column('int', { nullable: false })
  durationMinutes!: number;

  @Column('int', { nullable: true })
  durationDays?: number;

  @Column('boolean', { nullable: false })
  visibleOnParentCalendar!: boolean;

  constructor() {
    super();
  }
}
