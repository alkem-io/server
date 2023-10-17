import { Field, InputType } from '@nestjs/graphql';
import { CalloutType } from '@common/enums/callout.type';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CreateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto';
import { CreateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto';
import { CreateCalloutContributionPolicyInput } from '@domain/collaboration/callout-contribution-policy/dto/callout.contribution.policy.dto.create';

@InputType()
export class CreateCalloutInput {
  @Field(() => CreateCalloutFramingInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutFramingInput)
  framing!: CreateCalloutFramingInput;

  @Field(() => CreateCalloutContributionDefaultsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutContributionDefaultsInput)
  contributionDefaults?: CreateCalloutContributionDefaultsInput;

  @Field(() => CreateCalloutContributionPolicyInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutContributionPolicyInput)
  contributionPolicy?: CreateCalloutContributionPolicyInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutDisplayLocation, {
    nullable: true,
    description: 'Set callout display location for this Callout.',
  })
  displayLocation?: CalloutDisplayLocation;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CalloutVisibility, {
    nullable: true,
    description: 'Visibility of the Callout. Defaults to DRAFT.',
  })
  visibility?: CalloutVisibility;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Send notification if this flag is true and visibility is PUBLISHED. Defaults to false.',
  })
  sendNotification?: boolean;
}
