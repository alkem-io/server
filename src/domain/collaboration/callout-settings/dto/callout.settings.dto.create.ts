import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateCalloutSettingsContributionInput } from './callout.settings.contribution.dto.create';
import { CreateCalloutSettingsFramingInput } from './callout.settings.framing.dto.create';

@InputType()
@ObjectType('CreateCalloutSettingsData')
export class CreateCalloutSettingsInput {
  @Field(() => CreateCalloutSettingsFramingInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateCalloutSettingsFramingInput)
  framing?: CreateCalloutSettingsFramingInput;

  @Field(() => CreateCalloutSettingsContributionInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateCalloutSettingsContributionInput)
  contribution?: CreateCalloutSettingsContributionInput;

  @Field(() => CalloutVisibility, {
    nullable: true,
    description: 'Visibility of the Callout. Defaults to PUBLISHED.',
  })
  visibility?: CalloutVisibility;
}
