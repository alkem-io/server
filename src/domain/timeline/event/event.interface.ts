import { Field, ObjectType } from '@nestjs/graphql';
import { ICalendar } from '../calendar/calendar.interface';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@ObjectType('CalendarEvent')
export abstract class ICalendarEvent extends INameable {
  @Field(() => CalendarEventType, {
    description: 'The event type, e.g. webinar, meetup etc.',
  })
  type!: string;

  calendar?: ICalendar;

  // Expose the date at which the event was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments for this CalendarEvent',
  })
  comments!: IRoom;

  // The scheduling related fields
  startDate!: Date;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to indicate if this event is for a whole day.',
  })
  wholeDay!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to indicate if this event is for multiple days.',
  })
  multipleDays!: boolean;

  @Field(() => Number, {
    nullable: false,
    description: 'The length of the event in minutes.',
  })
  durationMinutes!: number;

  @Field(() => Number, {
    nullable: true,
    description: 'The length of the event in days.',
  })
  durationDays!: number;
}
