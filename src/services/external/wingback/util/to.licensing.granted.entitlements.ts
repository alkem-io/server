import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WingbackFeature } from '../types/wingback.type.feature';
import { isWingbackFeatureDetailPerUnit } from '@services/external/wingback/types/entitlement-details/wingback.feature.detail.per.unit';

enum WingbackFeatureNames {
  ACCOUNT_SPACE_FREE = 'ACCOUNT_SPACE_FREE',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
  ACCOUNT_INNOVATION_HUB = 'ACCOUNT_INNOVATION_HUB',
  ACCOUNT_INNOVATION_PACK = 'ACCOUNT_INNOVATION_PACK',
}

const typeMapping: Record<WingbackFeatureNames, LicenseEntitlementType> = {
  [WingbackFeatureNames.ACCOUNT_SPACE_FREE]:
    LicenseEntitlementType.ACCOUNT_SPACE_FREE,
  [WingbackFeatureNames.ACCOUNT_VIRTUAL_CONTRIBUTOR]:
    LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
  [WingbackFeatureNames.ACCOUNT_INNOVATION_HUB]:
    LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
  [WingbackFeatureNames.ACCOUNT_INNOVATION_PACK]:
    LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
};

/**
 * Maps Wingback features to LicensingGrantedEntitlements.
 * Supports only PER-UNIT pricing strategy
 * @param features
 */
export const toLicensingGrantedEntitlements = (
  features: WingbackFeature[]
): LicensingGrantedEntitlement[] => {
  const entitlements: (LicensingGrantedEntitlement | undefined)[] =
    features.map(({ slug, entitlement_details }) => {
      if (!isWingbackFeatureDetailPerUnit(entitlement_details)) {
        return undefined;
      }

      const licenseType = typeMapping[slug as WingbackFeatureNames];
      if (!licenseType) {
        // if the entitlement name is not recognized return undefined
        return undefined;
      }

      return {
        type: licenseType,
        limit: Number(entitlement_details.contracted_unit_count),
      };
    });

  return entitlements.filter(
    (entitlement): entitlement is LicensingGrantedEntitlement => !!entitlement
  );
};
