import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CreateCalloutSettingsFramingInput } from './callout.settings.framing.dto.create';
import { CreateCalloutSettingsContributionInput } from './callout.settings.contribution.dto.create';

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
    description: 'Visibility of the Callout. Defaults to DRAFT.',
  })
  visibility?: CalloutVisibility;
}
