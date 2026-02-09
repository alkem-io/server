import { UpdateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto';
import { UpdateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.update';
import { UpdateCalloutSettingsInput } from '@domain/collaboration/callout-settings/dto';
import { UpdateClassificationInput } from '@domain/common/classification/dto/classification.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateCalloutInput {
  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => UpdateCalloutFramingInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutFramingInput)
  framing!: UpdateCalloutFramingInput;

  @Field(() => UpdateCalloutSettingsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutSettingsInput)
  settings!: UpdateCalloutSettingsInput;

  @Field(() => UpdateClassificationInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateClassificationInput)
  classification?: UpdateClassificationInput;

  @Field(() => UpdateCalloutContributionDefaultsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutContributionDefaultsInput)
  contributionDefaults?: UpdateCalloutContributionDefaultsInput;

  @Field(() => String, {
    nullable: true,
    description: 'Set Group for this Callout.',
  })
  groupName?: string;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;
}
