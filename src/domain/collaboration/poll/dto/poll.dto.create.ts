import { MID_TEXT_LENGTH } from '@common/constants';
import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

@InputType('PollSettingsInput')
@ObjectType('PollSettingsData')
export class PollSettingsInput {
  @Field(() => Int, {
    nullable: true,
    description: 'Minimum selections required. Defaults to 1.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minResponses?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Maximum selections allowed. Defaults to 1. Set to 0 for unlimited.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxResponses?: number;

  @Field(() => PollResultsVisibility, {
    nullable: true,
    description: 'When results become visible. Defaults to VISIBLE.',
  })
  @IsOptional()
  resultsVisibility?: PollResultsVisibility;

  @Field(() => PollResultsDetail, {
    nullable: true,
    description: 'How much detail is shown. Defaults to FULL.',
  })
  @IsOptional()
  resultsDetail?: PollResultsDetail;
}

@InputType('CreatePollInput')
@ObjectType('CreatePollData')
export class CreatePollInput {
  @Field(() => String, {
    nullable: true,
    description: 'Poll title. Optional. Maximum length 512 characters.',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  title?: string;

  @Field(() => PollSettingsInput, {
    nullable: true,
    description:
      'Poll configuration settings (all immutable after creation). Optional; uses defaults for any unspecified settings.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PollSettingsInput)
  settings?: PollSettingsInput;

  @Field(() => [String], {
    nullable: false,
    description:
      'Initial options for the poll. Minimum 2 options required. Options appear in the order provided.',
  })
  @ArrayMinSize(2)
  @MaxLength(MID_TEXT_LENGTH, { each: true })
  options!: string[];
}
