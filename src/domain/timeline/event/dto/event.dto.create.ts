import { CalendarEventType } from '@common/enums/calendar.event.type';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { IsDate, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCalendarEventInput extends CreateNameableInput {
  @Field(() => CalendarEventType, { nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: CalendarEventType;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => Date, {
    nullable: false,
    description: 'The start date for the event.',
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
    nullable: false,
    description: 'Is the event visible on the parent calendar.',
  })
  visibleOnParentCalendar!: boolean;
}
