import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { CREDENTIAL_RULE_LICENSE_MANAGER } from '@common/constants/authorization/credential.rule.constants';
import { LicensingFrameworkAuthorizationService } from './licensing.framework.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicensingFrameworkService } from './licensing.framework.service';
import { LicensePolicyAuthorizationService } from '@platform/licensing/credential-based/license-policy/license.policy.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ILicensingFramework } from './licensing.framework.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

describe('LicensingFrameworkAuthorizationService', () => {
  let service: LicensingFrameworkAuthorizationService;
  let authorizationPolicyService: jest.Mocked<AuthorizationPolicyService>;
  let licensingFrameworkService: jest.Mocked<LicensingFrameworkService>;
  let licensePolicyAuthorizationService: jest.Mocked<LicensePolicyAuthorizationService>;

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
      reset: jest.fn().mockReturnValue(mockAuthorization),
      inheritParentAuthorization: jest.fn().mockReturnValue(mockAuthorization),
      appendCredentialRuleRegisteredAccess: jest
        .fn()
        .mockReturnValue(mockAuthorization),
      createCredentialRuleUsingTypesOnly: jest
        .fn()
        .mockReturnValue(credentialRule),
      appendCredentialAuthorizationRules: jest
        .fn()
        .mockReturnValue(mockAuthorization),
      appendCredentialRuleAnonymousRegisteredAccess: jest.fn(),
      appendCredentialAuthorizationRulesWithCriteria: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationPolicyService>;

    licensingFrameworkService = {
      getLicensingOrFail: jest.fn(),
    } as unknown as jest.Mocked<LicensingFrameworkService>;

    licensePolicyAuthorizationService = {
      applyAuthorizationPolicy: jest
        .fn()
        .mockReturnValue(mockPolicyAuthorization),
    } as unknown as jest.Mocked<LicensePolicyAuthorizationService>;

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
