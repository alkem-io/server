import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TransferAccountSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space to be transferred.',
  })
  spaceID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Account to which the Space will be transferred.',
  })
  targetAccountID!: string;
}
