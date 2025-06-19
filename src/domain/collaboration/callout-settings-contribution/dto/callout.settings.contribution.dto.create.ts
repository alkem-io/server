import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutState } from '@common/enums/callout.state';

@InputType()
@ObjectType('CreateCalloutSettingsContributionData')
export class CreateCalloutSettingsContributionInput {
  allowedContributionTypes?: CalloutContributionType[];

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;
}
