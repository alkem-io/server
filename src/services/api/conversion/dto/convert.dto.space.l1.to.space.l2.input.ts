import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConvertSpaceL1ToSpaceL2Input {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The Space L1 to be moved to be a child of another Space L. Both the L1 Space and the parent Space must be in the same L0 Space.',
  })
  spaceL1ID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Space L1 to be the parent of the Space L1 when it is moved to be L2.',
  })
  parentSpaceL1ID!: string;
}
