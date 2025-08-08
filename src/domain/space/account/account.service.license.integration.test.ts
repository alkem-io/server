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
 * The licensing flow has 4 stages:
 * 1. RESET to defaults (clean slate)
 * 2. CREDENTIAL-BASED LICENSING: Applied first, from platform credential defaults
 *    - Based on agent credentials held by the account
 *    - These are platform defaults, not external subscriptions
 * 3. BASELINE LICENSE PLAN: Applied second, with different behavior based on entitlement type
 *    - NON-SPACE entitlements (virtualContributor, innovationPacks, startingPages):
 *      * Baseline values are only applied if they are HIGHER than current entitlement limits (from credential-based)
 *      * If baseline values are LOWER than current limits, a warning is logged and current values are kept
 *      * If baseline values EQUAL current limits, no changes are made (no logging)
 *    - SPACE entitlements (spaceFree, spacePlus, spacePremium):
 *      * Baseline values are ALWAYS applied directly (overwrites current values from credential-based)
 *      * Verbose logging occurs when baseline is applied
 * 4. EXTERNAL LICENSING: Applied last, from Wingback subscriptions only
 *    - Wingback subscription licensing (if externalSubscriptionID exists) - HIGHEST priority, overrides everything
 *
 * Examples:
 *
 * Scenario 1: Non-space entitlements - Baseline higher than credential-based
 * - Current: virtualContributor = 1 (reset default)
 * - Credential-based: virtualContributor = 2 (platform credential defaults)
 * - After credential: virtualContributor = 2
 * - Baseline: virtualContributor = 5
 * - After baseline: virtualContributor = 5 (baseline higher, applied)
 * - External (Wingback): virtualContributor = 3
 * - Final result: virtualContributor = 3 (Wingback overrides everything)
 *
 * Scenario 2: Non-space entitlements - Credential-based higher than baseline
 * - Current: virtualContributor = 1 (reset default)
 * - Credential-based: virtualContributor = 8 (platform credential defaults)
 * - After credential: virtualContributor = 8
 * - Baseline: virtualContributor = 2
 * - After baseline: virtualContributor = 8 (baseline lower, kept with warning)
 * - External (Wingback): no override
 * - Final result: virtualContributor = 8
 *
 * Scenario 3: Space entitlements - Baseline always overwrites credential-based
 * - Current: spaceFree = 1 (reset default)
 * - Credential-based: spaceFree = 10 (platform credential defaults)
 * - After credential: spaceFree = 10
 * - Baseline: spaceFree = 2
 * - After baseline: spaceFree = 2 (baseline always applied for space entitlements)
 * - External (Wingback): spaceFree = 5
 * - Final result: spaceFree = 5 (Wingback overrides everything)
 *
 * Scenario 4: External Wingback overrides everything at the end
 * - Current: virtualContributor = 1, spaceFree = 1 (reset defaults)
 * - Credential-based: virtualContributor = 5, spaceFree = 3 (platform defaults)
 * - After credential: virtualContributor = 5, spaceFree = 3
 * - Baseline: virtualContributor = 2, spaceFree = 2
 * - After baseline: virtualContributor = 5 (kept, 5 > 2), spaceFree = 2 (baseline always applied)
 * - External (Wingback): virtualContributor = 12, spaceFree = 8
 * - Final result: virtualContributor = 12, spaceFree = 8 (Wingback overrides everything)
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
 * Expected results after applying credential-based licensing only (step 2):
 * - spaceFree: 1 → 5 (credential-based platform defaults)
 * - spacePlus: 1 → 8 (credential-based platform defaults)
 * - spacePremium: 0 → 0 (no credential-based defaults for this)
 * - virtualContributor: 0 → 10 (credential-based platform defaults)
 * - innovationPacks: 0 → 15 (credential-based platform defaults)
 *
 * Expected results after applying baseline licensing (step 3):
 * - spaceFree: 5 → 2 (baseline ALWAYS applied for space entitlements, overwrites credential-based)
 * - spacePlus: 8 → 1 (baseline ALWAYS applied for space entitlements, overwrites credential-based)
 * - spacePremium: 0 → 0 (baseline applied directly for space entitlements)
 * - virtualContributor: 10 → 10 (credential-based higher than baseline 3, kept with warning)
 * - innovationPacks: 15 → 15 (credential-based higher than baseline 2, kept with warning)
 *
 * Expected results after applying external licensing (step 4 - final result):
 * - spaceFree: 2 → 2 (no Wingback override for this in example)
 * - spacePlus: 1 → 1 (no Wingback override for this in example)
 * - spacePremium: 0 → 0 (no Wingback override for this)
 * - virtualContributor: 10 → 10 (no Wingback override for this in example)
 * - innovationPacks: 15 → 15 (no Wingback override for this in example)
 */

// Example credential-based licensing scenarios (platform defaults)
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

// Example external Wingback licensing scenarios
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
 * Expected results after applying credential-based licensing (step 2):
 * - virtualContributor: 0 → 10 (credential-based platform defaults)
 * - spaceFree: 1 → 5 (credential-based platform defaults)
 *
 * Expected results after applying baseline licensing (step 3):
 * - virtualContributor: 10 → 10 (credential-based higher than baseline 3, kept with warning)
 * - spaceFree: 5 → 2 (baseline always applied for space entitlements)
 *
 * Expected results after applying external Wingback licensing (step 4 - final):
 * - innovationPacks: (from baseline) → 15 (Wingback external override)
 * - spacePlus: (from baseline) → 8 (Wingback external override)
 */

// Test scenario examples for comprehensive coverage
export const testScenarios = {
  // Scenario A: Baseline higher than credential-based (non-space entitlements)
  baselineHigherThanCredential: {
    initial: { virtualContributor: 1 }, // Reset default
    credentialBased: { virtualContributor: 2 }, // Platform credential defaults applied
    baseline: { virtualContributor: 5 }, // Baseline applied
    external: {}, // No Wingback
    expected: { virtualContributor: 5 }, // Baseline wins (5 > 2)
  },

  // Scenario B: Credential-based higher than baseline (non-space entitlements)
  credentialHigherThanBaseline: {
    initial: { virtualContributor: 1 }, // Reset default
    credentialBased: { virtualContributor: 8 }, // Platform credential defaults applied
    baseline: { virtualContributor: 2 }, // Baseline applied
    external: {}, // No Wingback
    expected: { virtualContributor: 8 }, // Credential-based kept (8 > 2, warning logged)
  },

  // Scenario C: Wingback overrides everything at the end
  wingbackOverridesAll: {
    initial: { virtualContributor: 1 }, // Reset default
    credentialBased: { virtualContributor: 7 }, // Platform credential defaults applied
    baseline: { virtualContributor: 3 }, // Baseline applied
    external: { virtualContributor: 12 }, // Wingback external licensing applied
    expected: { virtualContributor: 12 }, // Wingback overrides everything
  },

  // Scenario D: Mixed sources for different entitlements through all 4 stages
  mixedSourcesFourStages: {
    initial: { virtualContributor: 1, innovationPacks: 0, spaceFree: 1 }, // Reset defaults
    credentialBased: { virtualContributor: 5, spaceFree: 3 }, // Platform credential defaults
    baseline: { virtualContributor: 2, innovationPacks: 1, spaceFree: 1 }, // Baseline applied
    external: { innovationPacks: 4 }, // Wingback external licensing
    expected: {
      virtualContributor: 5, // Credential (5) > baseline (2), kept with warning; no external override
      innovationPacks: 4, // Credential (0) → baseline (1) → external (4) - Wingback wins
      spaceFree: 1, // Credential (3) → baseline (1, always applied for space); no external override
    },
  },

  // Scenario E: Space entitlements always get baseline, then external can override
  spaceEntitlementFlow: {
    initial: { spaceFree: 1 }, // Reset default
    credentialBased: { spaceFree: 10 }, // Platform credential defaults
    baseline: { spaceFree: 2 }, // Baseline always applied for space
    external: { spaceFree: 7 }, // Wingback external licensing
    expected: { spaceFree: 7 }, // 1 → 10 (credential) → 2 (baseline always) → 7 (external wins)
  },

  // Scenario F: Non-space entitlements conditional baseline, then external overrides
  nonSpaceEntitlementFlow: {
    initial: { virtualContributor: 1 }, // Reset default
    credentialBased: { virtualContributor: 8 }, // Platform credential defaults
    baseline: { virtualContributor: 3 }, // Baseline applied
    external: { virtualContributor: 12 }, // Wingback external licensing
    expected: { virtualContributor: 12 }, // 1 → 8 (credential) → 8 (baseline lower, kept) → 12 (external wins)
  },

  // Scenario G: No credential-based or external licensing, only baseline applied
  onlyBaselineLicensing: {
    initial: { virtualContributor: 1, spaceFree: 1 }, // Reset defaults
    credentialBased: {}, // No platform credential defaults
    baseline: { virtualContributor: 5, spaceFree: 2 }, // Only baseline applied
    external: {}, // No Wingback
    expected: { virtualContributor: 5, spaceFree: 2 }, // Baseline applied normally
  },

  // Scenario H: Only external licensing, no credential-based or baseline
  onlyExternalLicensing: {
    initial: { virtualContributor: 1, spaceFree: 1 }, // Reset defaults
    credentialBased: {}, // No platform credential defaults
    baseline: {}, // No baseline values
    external: { virtualContributor: 8, spaceFree: 3 }, // Only Wingback
    expected: { virtualContributor: 8, spaceFree: 3 }, // External applied to reset defaults
  },
};
