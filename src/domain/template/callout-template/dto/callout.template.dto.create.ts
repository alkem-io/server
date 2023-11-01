import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.create';
import { CreateCalloutContributionDefaultsInput } from '@domain/collaboration/callout-contribution-defaults/dto';
import { CreateCalloutContributionPolicyInput } from '@domain/collaboration/callout-contribution-policy/dto';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { CalloutType } from '@common/enums/callout.type';

@InputType()
export class CreateCalloutTemplateInput extends CreateTemplateBaseInput {
  @Field(() => CalloutType, {
    description: 'Callout type.',
    nullable: false,
  })
  type!: CalloutType;

  @Field(() => CreateCalloutFramingInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutFramingInput)
  framing!: CreateCalloutFramingInput;

  @Field(() => CreateCalloutContributionDefaultsInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutContributionDefaultsInput)
  responseDefaults!: CreateCalloutContributionDefaultsInput;

  @Field(() => CreateCalloutContributionPolicyInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutContributionPolicyInput)
  responsePolicy!: CreateCalloutContributionPolicyInput;
}
