import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { CreateLicensePlanInput } from '@platform/license-plan';

@InputType()
export class CreateLicensePlanOnLicensingInput extends CreateLicensePlanInput {
  @Field(() => UUID, { nullable: false })
  licensingID!: string;
}
