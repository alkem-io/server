import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, NAMEID_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateCardProfileInput } from '@domain/collaboration/card-profile/dto';
import { Type } from 'class-transformer';

@InputType()
export class CreateCalendarEventInput extends CreateNameableInput {
  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  @MaxLength(NAMEID_LENGTH)
  nameID!: string;

  @Field(() => CreateCardProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCardProfileInput)
  profileData?: CreateCardProfileInput;

  @Field(() => Date, {
    nullable: false,
    description: 'The state date for the event.',
  })
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
