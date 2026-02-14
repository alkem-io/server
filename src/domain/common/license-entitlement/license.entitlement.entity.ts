import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { License } from '../license/license.entity';
import { ILicenseEntitlement } from './license.entitlement.interface';

export class LicenseEntitlement
  extends BaseAlkemioEntity
  implements ILicenseEntitlement
{
  license?: License;

  type!: LicenseEntitlementType;

  dataType!: LicenseEntitlementDataType;

  limit!: number;

  enabled!: boolean;
}
