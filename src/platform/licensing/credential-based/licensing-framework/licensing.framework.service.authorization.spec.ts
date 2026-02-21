import { CREDENTIAL_RULE_LICENSE_MANAGER } from '@common/constants/authorization/credential.rule.constants';
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
      inheritParentAuthorization: vi
        .fn()
        .mockResolvedValue(mockAuthorization),
      appendCredentialRuleRegisteredAccess: vi
        .fn()
        .mockReturnValue(mockAuthorization),
      createCredentialRuleUsingTypesOnly: vi
        .fn()
        .mockReturnValue(credentialRule),
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
        .mockResolvedValue(mockPolicyAuthorization),
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

    expect(
      authorizationPolicyService.createCredentialRuleUsingTypesOnly
    ).toHaveBeenCalledWith(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      [
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
      ],
      CREDENTIAL_RULE_LICENSE_MANAGER
    );

    const createdRule = authorizationPolicyService
      .createCredentialRuleUsingTypesOnly.mock.results[0]
      .value as IAuthorizationPolicyRuleCredential;
    expect(createdRule.cascade).toBe(true);
    expect(
      licensePolicyAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(licensing.licensePolicy, authorization);
  });
});
