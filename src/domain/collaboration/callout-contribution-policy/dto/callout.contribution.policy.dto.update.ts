import { InputType, Field } from '@nestjs/graphql';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutState } from '@common/enums/callout.state';

@InputType()
export class UpdateCalloutContributionPolicyInput {
  @Field(() => [CalloutContributionType], {
    nullable: true,
    description: 'The allowed contribution types for this callout.',
  })
  allowedResponseTypes?: CalloutContributionType[];

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;
}
