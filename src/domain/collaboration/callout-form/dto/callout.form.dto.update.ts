import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { UpdateCalloutFormQuestionInput } from './callout.form.dto.question.update';
import { UpdateCalloutFormSettingsInput } from './callout.form.dto.settings.update';

@InputType('UpdateCalloutFormInput')
export class UpdateCalloutFormInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  formID!: string;

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
