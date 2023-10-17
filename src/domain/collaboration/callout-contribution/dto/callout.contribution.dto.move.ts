import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class MoveCalloutContributionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Contribution to move.',
  })
  contributionID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Callout to move the Contribution to.',
  })
  calloutID!: string;
}
