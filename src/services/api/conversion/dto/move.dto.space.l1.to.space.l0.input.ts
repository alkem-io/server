import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MoveSpaceL1ToSpaceL0Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The L1 subspace to move to a different L0 space.',
  })
  spaceL1ID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The target L0 space (must be different from the current parent L0).',
  })
  targetSpaceL0ID!: string;
}
