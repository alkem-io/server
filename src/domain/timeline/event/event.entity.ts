import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalendarEvent } from './event.interface';
import { Comments } from '@domain/communication/comments';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { CardProfile } from '@domain/collaboration/card-profile/card.profile.entity';
import { Calendar } from '../calendar/calendar.entity';

@Entity()
export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  @Column('text')
  type: string;

  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @OneToOne(() => Comments, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments?: Comments;

  @OneToOne(() => CardProfile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile?: CardProfile;

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

  constructor(type: string) {
    super();
    this.type = type;
  }
}
