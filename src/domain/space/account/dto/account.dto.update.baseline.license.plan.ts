import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UpdateAccountLicensePlanInput } from '@domain/space/account.license.plan';

@InputType()
export class UpdateBaselineLicensePlanOnAccount extends UpdateAccountLicensePlanInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account to update the Baseline License Plan.',
  })
  accountID!: string;
}
