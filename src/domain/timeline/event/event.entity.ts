import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalendarEvent } from './event.interface';
import { Calendar } from '../calendar/calendar.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';

@Entity()
export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  @Column('text')
  type!: string;

  @Column('varchar', { length: 36, nullable: true })
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

  @Column('datetime')
  startDate!: Date;

  @Column('boolean', { default: true })
  wholeDay = true;

  @Column('boolean', { default: true })
  multipleDays = true;

  @Column('int')
  durationMinutes!: number;

  @Column('int')
  durationDays!: number;

  constructor() {
    super();
  }
}
