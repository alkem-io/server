import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class ConvertSpaceL2ToSpaceL1Input {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The Space L2 to be promoted. Note: the original Space will no longer exist after the conversion. ',
  })
  spaceL2ID!: string;
}
