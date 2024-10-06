import { LicenseType } from '@common/enums/license.type';
import { CreateEntitlementInput } from '@domain/common/license-entitlement/dto/entitlement.dto.create';

export class CreateLicenseInput {
  type!: LicenseType;

  entitlements!: CreateEntitlementInput[];
}
