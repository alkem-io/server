import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { UpdateCalloutSettingsFramingInput } from '@domain/collaboration/callout-settings-framing/dto';
import { UpdateCalloutSettingsContributionInput } from '@domain/collaboration/callout-settings-contribution/dto';

@InputType()
export class UpdateCalloutSettingsInput {
  @Field(() => UpdateCalloutSettingsFramingInput, { nullable: true })
  @ValidateNested()
  @Type(() => UpdateCalloutSettingsFramingInput)
  framing?: UpdateCalloutSettingsFramingInput;

  @Field(() => UpdateCalloutSettingsContributionInput, { nullable: true })
  @ValidateNested()
  @Type(() => UpdateCalloutSettingsContributionInput)
  contribution?: UpdateCalloutSettingsContributionInput;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;
}
