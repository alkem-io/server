import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutsSortOrderInput {
  @Field(() => UUID, { nullable: false })
  calloutsSetID!: string;

  @Field(() => [UUID_NAMEID], {
    name: 'calloutIDs',
    description: 'The IDs of the callouts to update the sort order on',
    nullable: false,
  })
  calloutIDs!: string[];
}
