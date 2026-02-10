import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity';
import { ILicense } from '../license/license.interface';

@ObjectType('LicenseEntitlement')
export abstract class ILicenseEntitlement extends IBaseAlkemio {
  @Field(() => LicenseEntitlementType, {
    nullable: false,
    description:
      'Type of the entitlement, e.g. Space, Whiteboard contributors etc.',
  })
  type!: LicenseEntitlementType;

  @Field(() => LicenseEntitlementDataType, {
    nullable: false,
    description: 'Data type of the entitlement, e.g. Limit, Feature flag etc.',
  })
  dataType!: LicenseEntitlementDataType;

  @Field(() => Number, {
    nullable: false,
    description: 'Limit of the entitlement',
  })
  limit!: number;

  @Field(() => Boolean, {
    nullable: false,
    description: 'If the Entitlement is enabled',
  })
  enabled!: boolean;

  license?: ILicense;
}
