import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MoveSpaceL1ToSpaceL2Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The L1 subspace to move and demote to L2.',
  })
  spaceL1ID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The target L1 subspace in a different L0 (new parent for the demoted space).',
  })
  targetSpaceL1ID!: string;
}
