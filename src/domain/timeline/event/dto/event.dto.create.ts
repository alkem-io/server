import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, NAMEID_LENGTH } from '@src/common/constants';
import { IsDate, IsOptional, MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateCalendarEventInput extends CreateNameableInput {
  @Field(() => CalendarEventType, { nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  @MaxLength(NAMEID_LENGTH)
  @IsOptional()
  nameID!: string;

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
}
