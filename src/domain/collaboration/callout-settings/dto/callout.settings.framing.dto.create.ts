import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateCalloutContributorsSettingsInput } from './callout.settings.contributors.dto.update';

@InputType()
@ObjectType('CreateCalloutSettingsFramingData')
export class CreateCalloutSettingsFramingInput {
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
}
