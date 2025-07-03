import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';

@InputType()
@ObjectType('CreateCalloutSettingsContributionData')
export class CreateCalloutSettingsContributionInput {
  @Field(() => Boolean, {
    description:
      'Can add contributions to the Callout. Allowed Contribution types is going to be readOnly, so this field can be used to enable or disable the contribution temporarily instead of setting allowedTypes to None.',
    nullable: true,
  })
  enabled?: boolean;

  @Field(() => [CalloutContributionType], {
    nullable: true,
    description: 'Allowed Contribution types.',
  })
  allowedTypes?: CalloutContributionType[];

  @Field(() => CalloutAllowedContributors, {
    nullable: true,
    description: 'Indicate who can add more contributions to the callout.',
  })
  canAddContributions?: CalloutAllowedContributors;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to contributions callout.',
  })
  commentsEnabled?: boolean;
}
