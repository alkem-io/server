import { CalendarEventType } from '@common/enums/calendar.event.type';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICalendar } from '../calendar/calendar.interface';

@ObjectType('CalendarEvent')
export abstract class ICalendarEvent extends INameable {
  @Field(() => CalendarEventType, {
    description: 'The event type, e.g. webinar, meetup etc.',
  })
  type!: CalendarEventType;

  calendar?: ICalendar;

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
  durationDays?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Google Calendar add-event URL for this CalendarEvent.',
  })
  googleCalendarUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Outlook Calendar add-event URL for this CalendarEvent.',
  })
  outlookCalendarUrl?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'ICS download URL for adding this CalendarEvent to Apple Calendar.',
  })
  appleCalendarUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'ICS download URL for this CalendarEvent.',
  })
  icsDownloadUrl?: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the event visible on the parent calendar.',
  })
  visibleOnParentCalendar!: boolean;

  @Field(() => ISpace, {
    nullable: true,
    description:
      'Which Subspace is this event part of. Only applicable if the Space has this option enabled.',
  })
  subspace?: ISpace;
}
