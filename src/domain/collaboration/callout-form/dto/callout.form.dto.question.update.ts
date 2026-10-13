import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UpdateCalloutFormQuestionOptionInput } from './callout.form.dto.question.option.update';

@InputType('UpdateCalloutFormQuestionInput')
export class UpdateCalloutFormQuestionInput {
  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of an existing question. Absent for a new question; an unknown ID is rejected.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String, { nullable: false })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'prompt must not be blank' })
  @MaxLength(MID_TEXT_LENGTH)
  prompt!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(LONG_TEXT_LENGTH)
  explanation?: string;

  @Field(() => CalloutFormQuestionType, { nullable: false })
  @IsEnum(CalloutFormQuestionType)
  type!: CalloutFormQuestionType;

  @Field(() => Boolean, { nullable: false })
  @IsBoolean()
  required!: boolean;

  @Field(() => [UpdateCalloutFormQuestionOptionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutFormQuestionOptionInput)
  options?: UpdateCalloutFormQuestionOptionInput[];
}
