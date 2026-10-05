import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateCalloutContributorsSettingsInput } from './callout.settings.contributors.dto.create';
import { CreateCalloutSelectionSettingsInput } from './callout.settings.selection.dto.create';
import { CreateCalloutSpacesSettingsInput } from './callout.settings.spaces.dto.create';

@InputType()
@ObjectType('CreateCalloutSettingsFramingData')
export class CreateCalloutSettingsFramingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled?: boolean;

  @Field(() => CreateCalloutContributorsSettingsInput, {
    nullable: true,
    description:
      'Configuration for a contributor-collection callout. Provide only when framing.type = CONTRIBUTORS.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutContributorsSettingsInput)
  contributors?: CreateCalloutContributorsSettingsInput;

  @Field(() => CreateCalloutSelectionSettingsInput, {
    nullable: true,
    description:
      'Manual-selection settings for collection callouts (CONTRIBUTORS or SPACES). Provide only when framing.type ∈ {CONTRIBUTORS, SPACES}.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutSelectionSettingsInput)
  selection?: CreateCalloutSelectionSettingsInput;

  @Field(() => CreateCalloutSpacesSettingsInput, {
    nullable: true,
    description:
      'Card-variant settings. Provide only when framing.type = SPACES.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutSpacesSettingsInput)
  spaces?: CreateCalloutSpacesSettingsInput;
}
