import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { ICalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.interface';
import { ICalloutContributionPolicy } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.interface';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('CalloutTemplate')
export abstract class ICalloutTemplate extends ITemplateBase {
  @Field(() => ICalloutFraming, {
    nullable: false,
    description: 'The framing for callouts created from this template.',
  })
  framing!: ICalloutFraming;

  @Field(() => ICalloutContributionDefaults, {
    nullable: false,
    description:
      'The defaults to use for Callouts created from this template.  ',
  })
  contributionDefaults!: ICalloutContributionDefaults;

  @Field(() => ICalloutContributionPolicy, {
    nullable: false,
    description:
      'The response policy to use for Callouts created from this template.  ',
  })
  contributionPolicy!: ICalloutContributionPolicy;
}
