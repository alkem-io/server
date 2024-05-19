import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateLicensePlanInput } from '@platform/license-plan';

@InputType()
export class UpdateLicensePlanOnLicenseManagerInput extends UpdateLicensePlanInput {
  @Field(() => UUID, { nullable: false })
  licenseManagerID!: string;
}
