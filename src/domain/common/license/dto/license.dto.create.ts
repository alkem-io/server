import { LicenseType } from '@common/enums/license.type';
import { CreateLicenseEntitlementInput } from '@domain/common/license-entitlement/dto/license.entitlement.dto.create';

export class CreateLicenseInput {
  type!: LicenseType;

  entitlements!: CreateLicenseEntitlementInput[];
}
