import { Int, Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class PaginationInput {
  @Field(() => UUID, {
    description: 'A pivot cursor after which items are selected',
    nullable: true,
  })
  after?: string;

  @Field(() => Int, {
    description: 'Amount of items after the cursor',
    nullable: true,
  })
  first?: number;

  @Field(() => UUID, {
    description: 'A pivot cursor before which items are selected',
    nullable: true,
  })
  before?: string;

  @Field(() => Int, {
    description: 'Amount of items before the cursor',
    nullable: true,
  })
  last?: number;
}
