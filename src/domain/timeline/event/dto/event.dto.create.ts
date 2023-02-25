import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, NAMEID_LENGTH } from '@src/common/constants';
import { IsDate, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateCardProfileInput } from '@domain/collaboration/card-profile/dto';
import { Type } from 'class-transformer';
import { CalendarEventType } from '@common/enums/calendar.event.type';

@InputType()
export class CreateCalendarEventInput extends CreateNameableInputOld {
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

  @Field(() => CreateCardProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCardProfileInput)
  profileData?: CreateCardProfileInput;

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
