import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateSubspacesSortOrderInput {
  @Field(() => UUID, { nullable: false })
  spaceID!: string;

  @Field(() => [UUID], {
    name: 'subspaceIDs',
    description: 'The IDs of the subspaces to update the sort order on',
    nullable: false,
  })
  subspaceIDs!: string[];
}
