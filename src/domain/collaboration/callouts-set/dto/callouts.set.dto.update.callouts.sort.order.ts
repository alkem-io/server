import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutsSortOrderInput {
  @Field(() => UUID, { nullable: false })
  calloutsSetID!: string;

  @Field(() => [UUID], {
    name: 'calloutIDs',
    description: 'The IDs of the callouts to update the sort order on',
    nullable: false,
  })
  calloutIDs!: string[];
}
