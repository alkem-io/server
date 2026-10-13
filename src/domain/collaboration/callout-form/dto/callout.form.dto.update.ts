import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UpdateCalloutFormQuestionInput } from './callout.form.dto.question.update';
import { UpdateCalloutFormSettingsInput } from './callout.form.dto.settings.update';

@InputType('UpdateCalloutFormInput')
export class UpdateCalloutFormInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  formID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The optional plain-text title of the Form, at most 512 characters. Trimmed; empty or whitespace-only (or null) clears it; omit to leave it unchanged.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MID_TEXT_LENGTH)
  title?: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'The optional plain-text description of the Form, at most 2048 characters. Trimmed; empty or whitespace-only (or null) clears it; omit to leave it unchanged.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string | null;

  @Field(() => [UpdateCalloutFormQuestionInput], {
    nullable: true,
    description:
      'The complete ordered list of questions. Omit to leave the questions unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutFormQuestionInput)
  questions?: UpdateCalloutFormQuestionInput[];

  @Field(() => UpdateCalloutFormSettingsInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCalloutFormSettingsInput)
  settings?: UpdateCalloutFormSettingsInput;
}
