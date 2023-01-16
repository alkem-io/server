import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICalendarEvent } from '../event/event.interface';

@ObjectType('Calendar')
export abstract class ICalendar extends IAuthorizable {
  @Field(() => [ICalendarEvent], {
    nullable: false,
    description: 'Events in this Calendar.',
  })
  events?: ICalendarEvent[];
}
