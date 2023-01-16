import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { ICardProfile } from '@domain/collaboration/card-profile/card.profile.interface';
import { ICalendar } from '../calendar/calendar.interface';

@ObjectType('CalendarEvent')
export abstract class ICalendarEvent extends INameable {
  @Field(() => String, {
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
}
