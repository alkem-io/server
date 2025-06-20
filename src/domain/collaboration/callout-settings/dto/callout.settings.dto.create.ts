import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CreateCalloutSettingsFramingInput } from '@domain/collaboration/callout-settings-framing/dto';
import { CreateCalloutSettingsContributionInput } from '@domain/collaboration/callout-settings-contribution/dto';

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
