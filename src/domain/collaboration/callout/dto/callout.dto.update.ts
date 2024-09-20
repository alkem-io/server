import { Field, InputType } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UpdateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.update';
import { UpdateCalloutContributionPolicyInput } from '@domain/collaboration/callout-contribution-policy/dto/callout.contribution.policy.dto.update';

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

  @Field(() => UpdateCalloutContributionDefaultsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutContributionDefaultsInput)
  contributionDefaults?: UpdateCalloutContributionDefaultsInput;

  @Field(() => UpdateCalloutContributionPolicyInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutContributionPolicyInput)
  contributionPolicy?: UpdateCalloutContributionPolicyInput;

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
