import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TransferAccountInnovationPackInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The InnovationPack to be transferred.',
  })
  innovationPackID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Account to which the Innovation Pack will be transferred.',
  })
  targetAccountID!: string;
}
