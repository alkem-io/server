import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TransferAccountVirtualContributorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Virtual Contributor to be transferred.',
  })
  virtualContributorID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Account to which the Virtual Contributor will be transferred.',
  })
  targetAccountID!: string;
}
