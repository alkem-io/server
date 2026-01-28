import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutSettingsContribution')
export abstract class ICalloutSettingsContribution {
  @Field(() => Boolean, {
    description:
      'Can add contributions to the Callout. Allowed Contribution types is going to be readOnly, so this field can be used to enable or disable the contribution temporarily instead of setting allowedTypes to None.',
    nullable: false,
  })
  enabled!: boolean;

  @Field(() => CalloutAllowedContributors, {
    nullable: false,
    description: 'Indicate who can add more contributions to the callout.',
  })
  canAddContributions!: CalloutAllowedContributors;

  @Field(() => [CalloutContributionType], {
    nullable: false,
    description: 'The allowed contribution types for this callout.',
  })
  allowedTypes!: CalloutContributionType[];

  @Field(() => Boolean, {
    nullable: false,
    description: 'Can comment to contributions callout.',
  })
  commentsEnabled!: boolean;
}
