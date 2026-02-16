import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Calendar } from '../calendar/calendar.entity';
import { ITimeline } from './timeline.interface';

export class Timeline extends AuthorizableEntity implements ITimeline {
  calendar?: Calendar;
}
