import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameableOld } from '@domain/common/entity/nameable-entity';
import { ICardProfile } from '@domain/collaboration/card-profile/card.profile.interface';
import { ICalendar } from '../calendar/calendar.interface';
import { CalendarEventType } from '@common/enums/calendar.event.type';

@ObjectType('CalendarEvent')
export abstract class ICalendarEvent extends INameableOld {
  @Field(() => CalendarEventType, {
    description: 'The event type, e.g. webinar, meetup etc.',
  })
  type!: string;

  profile?: ICardProfile;

  calendar?: ICalendar;

  // Expose the date at which the event was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  comments?: IComments;

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
