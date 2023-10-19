import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { CreateCalloutContributionInput } from '@domain/collaboration/callout-contribution/dto/callout.contribution.dto.create';

@InputType()
export class CreateContributionOnCalloutInput extends CreateCalloutContributionInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;
}
