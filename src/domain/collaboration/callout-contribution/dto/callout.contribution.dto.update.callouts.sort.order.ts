import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateContributionCalloutsSortOrderInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;

  @Field(() => [UUID], {
    name: 'contributionIDs',
    description: 'The IDs of the contributions to update the sort order on',
    nullable: false,
  })
  contributionIDs!: string[];
}
