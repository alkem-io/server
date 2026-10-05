import { CreateCalloutContributionInput } from '@domain/collaboration/callout-contribution/dto/callout.contribution.dto.create';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateContributionOnCalloutInput extends CreateCalloutContributionInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description:
      'Send the space-member and space-admin contribution notifications. Defaults to true; only an explicit false suppresses. The activity log entry is written regardless.',
  })
  sendNotification?: boolean;
}
