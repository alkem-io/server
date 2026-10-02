import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

@InputType('UpdateCalloutFormSettingsInput')
export class UpdateCalloutFormSettingsInput {
  @Field(() => CalloutFormResponseVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(CalloutFormResponseVisibility)
  visibility?: CalloutFormResponseVisibility;

  @Field(() => CalloutFormResponseMode, { nullable: true })
  @IsOptional()
  @IsEnum(CalloutFormResponseMode)
  responseMode?: CalloutFormResponseMode;

  @Field(() => CalloutFormState, { nullable: true })
  @IsOptional()
  @IsEnum(CalloutFormState)
  state?: CalloutFormState;
}
