import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutSettingsContributionInput {
  @Field(() => Boolean, {
    description:
      'Can add contributions to the Callout. Allowed Contribution types is going to be readOnly, so this field can be used to enable or disable the contribution temporarily instead of setting allowedTypes to None.',
    nullable: true,
  })
  enabled?: boolean;

  @Field(() => CalloutAllowedContributors, {
    nullable: true,
    description: 'Indicate who can add more contributions to the callout.',
  })
  canAddContributions?: CalloutAllowedContributors;

  // Not a field, this cannot be changed from the API
  allowedTypes?: CalloutContributionType[];

  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to contributions callout.',
  })
  commentsEnabled?: boolean;
}
