import { CalendarEventType } from '@common/enums/calendar.event.type';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateCalendarEventInput extends UpdateNameableInput {
  @Field(() => CalendarEventType, { nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  type?: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the Profile of the Card.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;

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
