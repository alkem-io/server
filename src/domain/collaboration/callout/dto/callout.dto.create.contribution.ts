import { CreateCalloutContributionInput } from '@domain/collaboration/callout-contribution/dto/callout.contribution.dto.create';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateContributionOnCalloutInput extends CreateCalloutContributionInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;
}
