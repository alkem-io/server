import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto';
import { UpdateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto';
import { UpdateCalloutContributionPolicyInput } from '@domain/collaboration/callout-contribution-policy/dto';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto';

@InputType()
export class UpdateCalloutTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => UpdateCalloutFramingInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutFramingInput)
  framing?: UpdateCalloutFramingInput;

  @Field(() => UpdateCalloutContributionDefaultsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutContributionDefaultsInput)
  contributionDefaults?: UpdateCalloutContributionDefaultsInput;

  @Field(() => UpdateCalloutContributionPolicyInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutContributionPolicyInput)
  contributionPolicy?: UpdateCalloutContributionPolicyInput;
}
