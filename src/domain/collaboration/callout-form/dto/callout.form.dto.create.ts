import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateCalloutFormQuestionInput } from './callout.form.dto.question.create';
import { CreateCalloutFormSettingsInput } from './callout.form.dto.settings.create';

@InputType('CreateCalloutFormInput')
@ObjectType('CreateCalloutFormData')
export class CreateCalloutFormInput {
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
