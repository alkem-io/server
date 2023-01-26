import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { Calendar } from '../calendar/calendar.entity';
import { ITimeline } from './timeline.interface';

@Entity()
export class Timeline extends AuthorizableEntity implements ITimeline {
  @OneToOne(() => Calendar, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  calendar?: Calendar;
}
