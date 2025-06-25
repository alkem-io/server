import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { UpdateCalloutSettingsFramingInput } from './callout.settings.framing.dto.update';
import { UpdateCalloutSettingsContributionInput } from './callout.settings.contribution.dto.update';

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
    nullable: true,
  })
  visibility?: CalloutVisibility;
}
