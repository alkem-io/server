import { CreateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.create';
import { CreateCalloutResponseDefaultsInput } from '@domain/collaboration/callout-response-defaults/dto';
import { CreateCalloutResponsePolicyInput } from '@domain/collaboration/callout-response-policy/dto/callout.response.policy.dto.create';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class CreateCalloutTemplateInput extends CreateTemplateBaseInput {
  @Field(() => CreateCalloutFramingInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutFramingInput)
  framing!: CreateCalloutFramingInput;

  @Field(() => CreateCalloutResponseDefaultsInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutResponseDefaultsInput)
  responseDefaults!: CreateCalloutResponseDefaultsInput;

  @Field(() => CreateCalloutResponsePolicyInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateCalloutResponsePolicyInput)
  responsePolicy!: CreateCalloutResponsePolicyInput;
}
