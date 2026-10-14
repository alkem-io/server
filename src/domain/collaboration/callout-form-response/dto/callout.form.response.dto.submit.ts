import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { CalloutFormAnswerInput } from '../../callout-form/dto/callout.form.dto.answer.input';

@InputType('SubmitCalloutFormResponseInput')
export class SubmitCalloutFormResponseInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  formID!: string;

  @Field(() => CalloutFormResponseVisibility, {
    nullable: false,
    description:
      'The response visibility the respondent was shown before submitting. The submission is rejected when the Form is now visible to a wider audience.',
  })
  @IsEnum(CalloutFormResponseVisibility)
  acknowledgedVisibility!: CalloutFormResponseVisibility;

  @Field(() => [CalloutFormAnswerInput], { nullable: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalloutFormAnswerInput)
  answers!: CalloutFormAnswerInput[];
}
