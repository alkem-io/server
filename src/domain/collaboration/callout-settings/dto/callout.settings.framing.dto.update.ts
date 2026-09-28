import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateCalloutContributorsSettingsInput } from './callout.settings.contributors.dto.update';
import { UpdateCalloutSelectionSettingsInput } from './callout.settings.selection.dto.update';
import { UpdateCalloutSpacesSettingsInput } from './callout.settings.spaces.dto.update';

@InputType()
export class UpdateCalloutSettingsFramingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled?: boolean;

  @Field(() => UpdateCalloutContributorsSettingsInput, {
    nullable: true,
    description:
      'Configuration for a contributor-collection callout. Provide only when framing.type = CONTRIBUTORS.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCalloutContributorsSettingsInput)
  contributors?: UpdateCalloutContributorsSettingsInput;

  @Field(() => UpdateCalloutSelectionSettingsInput, {
    nullable: true,
    description:
      'Manual-selection settings for collection callouts (CONTRIBUTORS or SPACES). Provide only when framing.type ∈ {CONTRIBUTORS, SPACES}.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCalloutSelectionSettingsInput)
  selection?: UpdateCalloutSelectionSettingsInput;

  @Field(() => UpdateCalloutSpacesSettingsInput, {
    nullable: true,
    description:
      'Card-variant settings. Provide only when framing.type = SPACES.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCalloutSpacesSettingsInput)
  spaces?: UpdateCalloutSpacesSettingsInput;
}
