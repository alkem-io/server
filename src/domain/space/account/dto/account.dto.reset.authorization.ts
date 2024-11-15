import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AccountAuthorizationResetInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the Account whose Authorization Policy should be reset.',
  })
  accountID!: string;
}
