import { UpdateCalloutFramingInput } from '@domain/collaboration/callout-framing/dto/callout.framing.dto.update';
import { UpdateCalloutResponseDefaultsInput } from '@domain/collaboration/callout-response-defaults/dto/callout.response.defaults.dto.update';
import { UpdateCalloutResponsePolicyInput } from '@domain/collaboration/callout-response-policy/dto/callout.response.policy.dto.update';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateCalloutTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => UpdateCalloutFramingInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutFramingInput)
  framing?: UpdateCalloutFramingInput;

  @Field(() => UpdateCalloutResponseDefaultsInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutResponseDefaultsInput)
  responseDefaults?: UpdateCalloutResponseDefaultsInput;

  @Field(() => UpdateCalloutResponsePolicyInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateCalloutResponsePolicyInput)
  responsePolicy?: UpdateCalloutResponsePolicyInput;
}
