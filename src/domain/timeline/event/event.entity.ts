import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalendarEvent } from './event.interface';
import { Calendar } from '../calendar/calendar.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { UUID_LENGTH } from '@common/constants';

@Entity()
export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  @Column('text')
  type!: string;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

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
  multipleDays = true;

  @Column('int', { nullable: false })
  durationMinutes!: number;

  @Column('int', { nullable: true })
  durationDays!: number;

  constructor() {
    super();
  }
}
