import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { ICalloutResponseDefaults } from '@domain/collaboration/callout-response-defaults/callout.respnse.defaults.interface';
import { ICalloutResponsePolicy } from '@domain/collaboration/callout-response-policy/callout.response.policy.interface';

@ObjectType('CalloutTemplate')
export abstract class ICalloutTemplate extends ITemplateBase {
  @Field(() => ICalloutFraming, {
    nullable: false,
    description: 'The framing for callouts created from this template.',
  })
  framing!: ICalloutFraming;

  @Field(() => ICalloutResponseDefaults, {
    nullable: false,
    description:
      'The defaults to use for Callouts created from this template.  ',
  })
  responseDefaults!: ICalloutResponseDefaults;

  @Field(() => ICalloutResponsePolicy, {
    nullable: false,
    description:
      'The response policy to use for Callouts created from this template.  ',
  })
  responsePolicy!: ICalloutResponsePolicy;
}
