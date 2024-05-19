import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { DeleteLicensePlanInput } from '@platform/license-plan';

@InputType()
export class DeleteLicensePlanOnLicenseManagerInput extends DeleteLicensePlanInput {
  @Field(() => UUID, { nullable: false })
  licenseManagerID!: string;
}
