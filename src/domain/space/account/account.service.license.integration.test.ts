// Integration test to verify the baseline license plan functionality
// This file demonstrates the expected behavior of the modified implementation

import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { IAccount } from './account.interface';

/**
 * This file demonstrates the expected behavior of the complete license application flow.
 *
 * The licensing flow has 3 stages:
 * 1. RESET to defaults (clean slate)
 * 2. BASELINE LICENSE PLAN: Applied differently based on entitlement type
 *    - NON-SPACE entitlements (virtualContributor, innovationPacks, startingPages):
 *      * Baseline values are only applied if they are HIGHER than current entitlement limits
 *      * If baseline values are LOWER than current limits, a warning is logged and current values are kept
 *      * If baseline values EQUAL current limits, no changes are made (no logging)
 *    - SPACE entitlements (spaceFree, spacePlus, spacePremium):
 *      * Baseline values are ALWAYS applied directly (overwrites current values)
 *      * Verbose logging occurs when baseline is applied
 * 3. EXTERNAL LICENSING: Overrides everything if available
 *    - Credential-based licensing (from agent credentials)
 *    - Wingback subscription licensing (if externalSubscriptionID exists)
 *
 * Examples:
 *
 * Scenario 1: Non-space entitlements - Baseline higher than current
 * - Current: virtualContributor = 1
 * - Baseline: virtualContributor = 3
 * - Result: virtualContributor = 3 (baseline applied, verbose logged)
 *
 * Scenario 2: Non-space entitlements - Baseline lower than current
 * - Current: virtualContributor = 5
 * - Baseline: virtualContributor = 2
 * - Result: virtualContributor = 5 (current kept, warning logged)
 *
 * Scenario 3: Space entitlements - Baseline always applied
 * - Current: spaceFree = 5
 * - Baseline: spaceFree = 2
 * - Result: spaceFree = 2 (baseline applied directly, verbose logged)
 *
 * Scenario 4: External licensing overrides everything
 * - Current: virtualContributor = 1, Baseline: virtualContributor = 3
 * - External: virtualContributor = 10
 * - Result: virtualContributor = 10 (external licensing wins)
 */

export const exampleBaselineLicensePlan: IAccountLicensePlan = {
  spaceFree: 2,
  spacePlus: 1,
  spacePremium: 0,
  virtualContributor: 3,
  innovationPacks: 2,
  startingPages: 5,
};

export const exampleAccountWithBaseline: Partial<IAccount> = {
  id: 'example-account',
  baselineLicensePlan: exampleBaselineLicensePlan,
};

export const exampleLicenseWithMixedValues: ILicense = {
  id: 'example-license',
  type: 'account' as any,
  entitlements: [
    {
      id: '1',
      type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 1, // Space entitlements ALWAYS get baseline values applied (will become 2)
      enabled: false,
    },
    {
      id: '2',
      type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 3, // Space entitlements ALWAYS get baseline values applied (will become 1)
      enabled: true,
    },
    {
      id: '3',
      type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 0, // Space entitlements ALWAYS get baseline values applied (will stay 0)
      enabled: false,
    },
    {
      id: '4',
      type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 0, // Lower than baseline (3) - should be updated to 3
      enabled: false,
    },
    {
      id: '5',
      type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 5, // Higher than baseline (2) - should remain 5, warning logged
      enabled: true,
    },
  ],
} as ILicense;

/**
 * Expected results after applying baseline licensing only:
 * - spaceFree: 1 → 2 (baseline applied directly - space entitlements always get baseline)
 * - spacePlus: 3 → 1 (baseline applied directly - space entitlements always get baseline)
 * - spacePremium: 0 → 0 (baseline applied directly - space entitlements always get baseline)
 * - virtualContributor: 0 → 3 (baseline applied since 3 > 0, enabled = true)
 * - innovationPacks: 5 → 5 (current kept since 5 > 2, warning logged)
 */

// Example external licensing scenarios
export const exampleCredentialBasedLicensing = [
  {
    type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
    limit: 10,
    enabled: true,
  },
  {
    type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
    limit: 5,
    enabled: true,
  },
];

export const exampleWingbackLicensing = [
  {
    type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
    limit: 15,
    enabled: true,
  },
  {
    type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
    limit: 8,
    enabled: true,
  },
];

/**
 * Expected results after applying external licensing:
 * If credential-based licensing is available:
 * - virtualContributor: 3 → 10 (credential-based override)
 * - spaceFree: 2 → 5 (credential-based override)
 *
 * If Wingback licensing is available:
 * - innovationPacks: 5 → 15 (Wingback override)
 * - spacePlus: 1 → 8 (Wingback override)
 */
