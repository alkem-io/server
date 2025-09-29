import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Field, InputType } from '@nestjs/graphql';

@InputType('LicensingGrantedEntitlementInput')
export class LicensingGrantedEntitlementInput {
  @Field(() => LicenseEntitlementType, {
    description: 'The entitlement that is granted.',
  })
  type!: LicenseEntitlementType;

  @Field(() => Number, { nullable: false })
  limit!: number;
}
