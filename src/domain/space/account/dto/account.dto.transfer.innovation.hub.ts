import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class TransferAccountInnovationHubInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Innovation Hub to be transferred.',
  })
  innovationHubID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Account to which the Innovation Hub will be transferred.',
  })
  targetAccountID!: string;
}
