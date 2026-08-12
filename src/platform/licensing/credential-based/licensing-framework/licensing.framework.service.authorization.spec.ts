import {
  CREDENTIAL_RULE_LICENSE_MANAGER,
  CREDENTIAL_RULE_LICENSE_PLAN_USAGE,
  CREDENTIAL_RULE_LICENSE_RESET,
} from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicensePolicyAuthorizationService } from '@platform/licensing/credential-based/license-policy/license.policy.service.authorization';
import { type Mocked, vi } from 'vitest';
import { ILicensingFramework } from './licensing.framework.interface';
import { LicensingFrameworkService } from './licensing.framework.service';
import { LicensingFrameworkAuthorizationService } from './licensing.framework.service.authorization';

describe('LicensingFrameworkAuthorizationService', () => {
  let service: LicensingFrameworkAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let licensingFrameworkService: Mocked<LicensingFrameworkService>;
  let licensePolicyAuthorizationService: Mocked<LicensePolicyAuthorizationService>;

  beforeEach(() => {
    const mockAuthorization = {
      id: 'authorization',
    } as unknown as IAuthorizationPolicy;
    const mockPolicyAuthorization = {
      id: 'policy-authorization',
    } as unknown as IAuthorizationPolicy;
    const credentialRule: IAuthorizationPolicyRuleCredential = {
      criterias: [],
      grantedPrivileges: [],
      cascade: false,
      name: 'license-manager-rule',
    };

    authorizationPolicyService = {
      reset: vi.fn().mockReturnValue(mockAuthorization),
      inheritParentAuthorization: vi.fn().mockReturnValue(mockAuthorization),
      appendCredentialRuleRegisteredAccess: vi
        .fn()
        .mockReturnValue(mockAuthorization),
      createCredentialRuleUsingTypesOnly: vi
        .fn()
        .mockImplementation(() => ({ ...credentialRule })),
      appendCredentialAuthorizationRules: vi
        .fn()
        .mockReturnValue(mockAuthorization),
      appendCredentialRuleAnonymousRegisteredAccess: vi.fn(),
      appendCredentialAuthorizationRulesWithCriteria: vi.fn(),
    } as unknown as Mocked<AuthorizationPolicyService>;

    licensingFrameworkService = {
      getLicensingOrFail: vi.fn(),
    } as unknown as Mocked<LicensingFrameworkService>;

    licensePolicyAuthorizationService = {
      applyAuthorizationPolicy: vi
        .fn()
        .mockReturnValue(mockPolicyAuthorization),
    } as unknown as Mocked<LicensePolicyAuthorizationService>;

    service = new LicensingFrameworkAuthorizationService(
      authorizationPolicyService,
      licensingFrameworkService,
      licensePolicyAuthorizationService
    );
  });

  it('grants license admins privilege to assign licenses', async () => {
    const authorization = {
      id: 'authorization',
    } as unknown as IAuthorizationPolicy;
    const licensing = {
      id: 'licensing-id',
      authorization,
      licensePolicy: {},
    } as unknown as ILicensingFramework;

    await service.applyAuthorizationPolicy(licensing, undefined);

    // corr-server-13 fix: GRANT is no longer part of this CRUD bundle — it
    // used to leak A12's GRANT privilege to PLATFORM_SETTINGS_ADMIN (a
    // member of this rule's credential list) despite A12 declaring
    // PLATFORM_LICENSE_MANAGER (∪ legacy) as its only owner/reachers.
    expect(
      authorizationPolicyService.createCredentialRuleUsingTypesOnly
    ).toHaveBeenCalledWith(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        // 027-platform-role-redesign (T040, A13): plan/entitlement-mapping
        // definition re-anchored onto platform-settings-admin, additively.
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
      ],
      CREDENTIAL_RULE_LICENSE_MANAGER
    );

    // 027-platform-role-redesign (T046, A12 usage): a separate GRANT-only
    // rule, kept apart from the CRUD `licensings` bundle above so
    // PLATFORM_SETTINGS_ADMIN does not also acquire A12's usage GRANT.
    // corr-server-13 fix: GLOBAL_LICENSE_MANAGER/GLOBAL_PLATFORM_MANAGER's
    // legacy A12 reach moved HERE (from `licensings`, which no longer
    // carries GRANT at all) so it is preserved on the one rule A12 is
    // actually declared against.
    expect(
      authorizationPolicyService.createCredentialRuleUsingTypesOnly
    ).toHaveBeenCalledWith(
      [AuthorizationPrivilege.GRANT],
      [
        AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
      ],
      CREDENTIAL_RULE_LICENSE_PLAN_USAGE
    );

    expect(
      authorizationPolicyService.createCredentialRuleUsingTypesOnly
    ).toHaveBeenCalledWith(
      [AuthorizationPrivilege.LICENSE_RESET],
      [
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
      ],
      CREDENTIAL_RULE_LICENSE_RESET
    );

    const createdRule = authorizationPolicyService
      .createCredentialRuleUsingTypesOnly.mock.results[0]
      .value as IAuthorizationPolicyRuleCredential;
    expect(createdRule.cascade).toBe(true);
    const licensePlanUsageRule = authorizationPolicyService
      .createCredentialRuleUsingTypesOnly.mock.results[1]
      .value as IAuthorizationPolicyRuleCredential;
    expect(licensePlanUsageRule.cascade).toBe(true);
    const licenseResetRule = authorizationPolicyService
      .createCredentialRuleUsingTypesOnly.mock.results[2]
      .value as IAuthorizationPolicyRuleCredential;
    expect(licenseResetRule.cascade).toBe(false);
    expect(
      licensePolicyAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(licensing.licensePolicy, authorization);
  });

  // workspace#032: privilege hardening for the Platform Operations Admin role.
  it('grants PLATFORM_OPERATIONS_ADMIN exactly LICENSE_RESET on the licensing policy — never the license-manager CRUD/GRANT bundle', async () => {
    const licensing = {
      id: 'licensing-id',
      authorization: { id: 'authorization' },
      licensePolicy: {},
    } as unknown as ILicensingFramework;

    await service.applyAuthorizationPolicy(licensing, undefined);

    const granted = new Set<AuthorizationPrivilege>();
    for (const [privileges, credentialTypes] of authorizationPolicyService
      .createCredentialRuleUsingTypesOnly.mock.calls) {
      if (
        credentialTypes.includes(
          AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN
        )
      ) {
        for (const p of privileges) {
          granted.add(p);
        }
      }
    }

    expect(granted).toEqual(new Set([AuthorizationPrivilege.LICENSE_RESET]));
  });
});
