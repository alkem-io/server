import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowStatesSortOrderInput {
  @Field(() => UUID, { nullable: false })
  innovationFlowID!: string;

  @Field(() => [UUID], {
    name: 'stateIDs',
    description: 'The IDs of the states to update the sort order on',
    nullable: false,
  })
  stateIDs!: string[];
}
