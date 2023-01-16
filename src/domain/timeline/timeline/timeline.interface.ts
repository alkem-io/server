import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ICalendar } from '../calendar/calendar.interface';

@ObjectType('Timeline')
export abstract class ITimeline extends IAuthorizable {
  calendar?: ICalendar;
}
