import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConvertSpaceL1ToSpaceL0Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space L1 to be promoted to be a new Space L0. ',
  })
  spaceL1ID!: string;
}
