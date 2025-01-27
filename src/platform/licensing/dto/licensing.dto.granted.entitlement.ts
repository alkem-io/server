import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensingGrantedEntitlement')
export class LicensingGrantedEntitlement {
  @Field(() => LicenseEntitlementType, {
    description: 'The entitlement that is granted.',
  })
  type!: LicenseEntitlementType;

  @Field(() => Number, { nullable: false })
  limit!: number;
}
