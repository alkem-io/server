import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

export class CreateLicenseEntitlementInput {
  type!: LicenseEntitlementType;
  dataType!: LicenseEntitlementDataType;
  limit!: number;
  enabled!: boolean;
}
