import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class ConvertSpaceL2ToSpaceL1Input {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space L2 to be promoted. ',
  })
  @IsUUID()
  spaceL2ID!: string;
}
