import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class ConvertSpaceL1ToSpaceL0Input {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The Space L1 to be promoted to be a new Space L0. Note: the original Space L1 will no longer exist after the conversion. ',
  })
  spaceL1ID!: string;
}
