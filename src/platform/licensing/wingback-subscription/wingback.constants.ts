import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

export enum WingbackFeatureNames {
  ACCOUNT_SPACE_FREE = 'ACCOUNT_SPACE_FREE',
  ACCOUNT_SPACE_PLUS = 'ACCOUNT_SPACE_PLUS',
  ACCOUNT_SPACE_PREMIUM = 'ACCOUNT_SPACE_PREMIUM',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
  ACCOUNT_INNOVATION_HUB = 'ACCOUNT_INNOVATION_HUB',
  ACCOUNT_INNOVATION_PACK = 'ACCOUNT_INNOVATION_PACK',
}

export const WingbackFeatureMapping: Record<
  WingbackFeatureNames,
  LicenseEntitlementType
> = {
  [WingbackFeatureNames.ACCOUNT_SPACE_FREE]:
    LicenseEntitlementType.ACCOUNT_SPACE_FREE,
  [WingbackFeatureNames.ACCOUNT_SPACE_PLUS]:
    LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
  [WingbackFeatureNames.ACCOUNT_SPACE_PREMIUM]:
    LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
  [WingbackFeatureNames.ACCOUNT_VIRTUAL_CONTRIBUTOR]:
    LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
  [WingbackFeatureNames.ACCOUNT_INNOVATION_HUB]:
    LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
  [WingbackFeatureNames.ACCOUNT_INNOVATION_PACK]:
    LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
};
