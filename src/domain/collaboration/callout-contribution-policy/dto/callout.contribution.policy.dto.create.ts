import { InputType, Field } from '@nestjs/graphql';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutState } from '@common/enums/callout.state';

@InputType()
export class CreateCalloutContributionPolicyInput {
  @Field(() => [CalloutContributionType], {
    nullable: true,
    description: 'Contribution types of the callout.',
  })
  allowedContributionTypes?: CalloutContributionType[];

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;
}
