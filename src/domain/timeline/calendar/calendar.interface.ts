import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ICalendarEvent } from '../event/event.interface';

@ObjectType('Calendar')
export abstract class ICalendar extends IAuthorizable {
  events?: ICalendarEvent[];
}
