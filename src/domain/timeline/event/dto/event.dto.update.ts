import { CalendarEventType } from '@common/enums/calendar.event.type';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { IsDate, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateCalendarEventInput extends UpdateNameableInput {
  @Field(() => CalendarEventType, { nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  type?: CalendarEventType;

  @Field(() => Date, {
    nullable: false,
    description: 'The state date for the event.',
  })
  @IsDate()
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

  // For whole-day events this is the offset between the start and end dates
  // (End − Start), NOT the event's length: a single-day whole-day event is 0, and
  // the ICS/Google/Outlook export appends the RFC 5545 exclusive +1 day so it
  // still covers one full day. Timed events store their true start→end duration.
  @Field(() => Number, {
    nullable: false,
    description: 'The length of the event in minutes.',
  })
  durationMinutes!: number;

  @Field(() => Number, {
    nullable: true,
    description: 'The length of the event in days.',
  })
  @IsOptional()
  durationDays!: number;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Is the event visible on the parent calendar.',
  })
  visibleOnParentCalendar?: boolean;
}
