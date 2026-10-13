import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateCalloutFormQuestionOptionInput } from './callout.form.dto.question.option.create';

@InputType('CreateCalloutFormQuestionInput')
@ObjectType('CreateCalloutFormQuestionData')
export class CreateCalloutFormQuestionInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question text. Required, at most 512 characters.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'prompt must not be blank' })
  @MaxLength(MID_TEXT_LENGTH)
  prompt!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Optional helper text. At most 2048 characters.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LONG_TEXT_LENGTH)
  explanation?: string;

  @Field(() => CalloutFormQuestionType, { nullable: false })
  @IsEnum(CalloutFormQuestionType)
  type!: CalloutFormQuestionType;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Whether an answer is required. Defaults to false.',
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @Field(() => [CreateCalloutFormQuestionOptionInput], {
    nullable: true,
    description:
      'The options of a choice question (2 to 20). Must be absent for the text types.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutFormQuestionOptionInput)
  options?: CreateCalloutFormQuestionOptionInput[];
}
