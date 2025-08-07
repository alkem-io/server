// Integration test to verify the baseline license plan functionality
// This file demonstrates the expected behavior of the modified implementation

import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { IAccount } from './account.interface';

/**
 * This file demonstrates the expected behavior of the baseline license plan application.
 *
 * Key behavior changes:
 * 1. Baseline values are only applied if they are HIGHER than current entitlement limits
 * 2. If baseline values are LOWER than current limits, a warning is logged and current values are kept
 * 3. If baseline values EQUAL current limits, no changes are made (no logging)
 *
 * Examples:
 *
 * Scenario 1: Baseline higher than current
 * - Current: spaceFree = 1
 * - Baseline: spaceFree = 3
 * - Result: spaceFree = 3 (baseline applied)
 *
 * Scenario 2: Baseline lower than current
 * - Current: spaceFree = 5
 * - Baseline: spaceFree = 2
 * - Result: spaceFree = 5 (current kept, warning logged)
 *
 * Scenario 3: Baseline equal to current
 * - Current: spaceFree = 2
 * - Baseline: spaceFree = 2
 * - Result: spaceFree = 2 (no change, no logging)
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
      limit: 1, // Lower than baseline (2) - should be updated
      enabled: false,
    },
    {
      id: '2',
      type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 3, // Higher than baseline (1) - should be kept, warning logged
      enabled: true,
    },
    {
      id: '3',
      type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 0, // Equal to baseline (0) - should remain unchanged
      enabled: false,
    },
    {
      id: '4',
      type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
      dataType: LicenseEntitlementDataType.LIMIT,
      limit: 0, // Lower than baseline (3) - should be updated
      enabled: false,
    },
  ],
} as ILicense;

/**
 * Expected results after applying baseline:
 * - spaceFree: 1 → 2 (baseline applied, enabled = true)
 * - spacePlus: 3 → 3 (kept, warning logged)
 * - spacePremium: 0 → 0 (no change)
 * - virtualContributor: 0 → 3 (baseline applied, enabled = true)
 */
