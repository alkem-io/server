import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { DeleteLicensePlanInput } from '@platform/license-plan';

@InputType()
export class DeleteLicensePlanOnLicensingInput extends DeleteLicensePlanInput {
  @Field(() => UUID, { nullable: false })
  licensingID!: string;
}
