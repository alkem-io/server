import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

@InputType('CreateCalloutFormSettingsInput')
@ObjectType('CreateCalloutFormSettingsData')
export class CreateCalloutFormSettingsInput {
  @Field(() => CalloutFormResponseVisibility, {
    nullable: true,
    description: 'Who can read all the responses. Defaults to ADMINS.',
  })
  @IsOptional()
  @IsEnum(CalloutFormResponseVisibility)
  visibility?: CalloutFormResponseVisibility;

  @Field(() => CalloutFormResponseMode, {
    nullable: true,
    description: 'One or several responses per member. Defaults to SINGLE.',
  })
  @IsOptional()
  @IsEnum(CalloutFormResponseMode)
  responseMode?: CalloutFormResponseMode;

  @Field(() => CalloutFormState, {
    nullable: true,
    description: 'Whether the Form accepts responses. Defaults to OPEN.',
  })
  @IsOptional()
  @IsEnum(CalloutFormState)
  state?: CalloutFormState;
}
