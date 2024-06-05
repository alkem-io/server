import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignLicensePlanToAccount {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the LicensePlan to assign.',
  })
  licensePlanID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Account to assign the LicensePlan to.',
  })
  accountID!: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the Licensing to use.',
  })
  licensingID?: string;
}
