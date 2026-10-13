import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

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

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Whether the Form box starts collapsed for every viewer. Omit (or null) to leave it unchanged.',
  })
  @IsOptional()
  @IsBoolean()
  defaultCollapsed?: boolean;
}
