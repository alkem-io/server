import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AccountLicenseResetInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the Account whose License and Entitlements should be reset.',
  })
  accountID!: string;
}
