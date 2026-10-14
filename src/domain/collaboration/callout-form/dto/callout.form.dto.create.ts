import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateCalloutFormQuestionInput } from './callout.form.dto.question.create';
import { CreateCalloutFormSettingsInput } from './callout.form.dto.settings.create';

@InputType('CreateCalloutFormInput')
@ObjectType('CreateCalloutFormData')
export class CreateCalloutFormInput {
  @Field(() => String, {
    nullable: true,
    description:
      'The optional plain-text title of the Form, at most 512 characters. Trimmed; empty or whitespace-only is stored as null.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MID_TEXT_LENGTH)
  title?: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'The optional plain-text description of the Form, at most 2048 characters. Trimmed; empty or whitespace-only is stored as null.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string | null;

  @Field(() => [CreateCalloutFormQuestionInput], {
    nullable: false,
    description:
      'The ordered questions of the Form. Between 1 and 50; the count is enforced with a reason code.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutFormQuestionInput)
  questions!: CreateCalloutFormQuestionInput[];

  @Field(() => CreateCalloutFormSettingsInput, {
    nullable: true,
    description:
      'The Form settings. Defaults: visibility ADMINS, responseMode SINGLE, state OPEN.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutFormSettingsInput)
  settings?: CreateCalloutFormSettingsInput;
}
