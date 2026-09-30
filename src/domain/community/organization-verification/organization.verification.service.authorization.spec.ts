import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { OrganizationVerificationAuthorizationService } from './organization.verification.service.authorization';

describe('OrganizationVerificationAuthorizationService', () => {
  let service: OrganizationVerificationAuthorizationService;
  let authorizationPolicyService: {
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationVerificationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationVerificationAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset authorization and append credential rules', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: '[]' };
      const resetAuth = { id: 'auth-1', credentialRules: '[]' };

      const verification = {
        id: 'ver-1',
        authorization: mockAuth,
      } as any;

      authorizationPolicyService.reset.mockReturnValue(resetAuth);
      // createCredentialRuleUsingTypesOnly and createCredentialRule are on
      // this.authorizationPolicyService
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { type: 'global-admin-rule' }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        type: 'org-admin-rule',
      });

      const result = await service.applyAuthorizationPolicy(
        verification,
        'account-1'
      );

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(mockAuth);
      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      // The result is the authorization set on the verification object
      expect(result).toBeDefined();
    });

    // QA server-C2-d (ruling (a)): approving an organization's verification
    // is organization lifecycle — Platform Support's A6 family. It needs
    // UPDATE (the resolver gate) AND GRANT (the MANUALLY_VERIFY / RESET /
    // REOPEN / ARCHIVE lifecycle guards) plus READ, on its OWN rule, never
    // CREATE/DELETE; the legacy GA/GS/GLOBAL_COMMUNITY_READ rule is untouched.
    it('QA server-C2-d: grants platform-support EXACTLY READ + UPDATE + GRANT on its own non-cascading rule, legacy rule unchanged', async () => {
      const auth = { id: 'auth-1', credentialRules: [] };
      authorizationPolicyService.reset.mockReturnValue(auth);
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockImplementation(
        (privileges: any, types: any, name: any) => ({
          grantedPrivileges: privileges,
          criterias: [...types],
          name,
          cascade: true,
        })
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        criterias: [],
        cascade: true,
      });
      // The service appends through its SECOND AuthorizationPolicyService
      // injection (`authorizationPolicy`), a distinct mock instance here.
      const appendingPolicyService = (service as any).authorizationPolicy as {
        appendCredentialAuthorizationRules: Mock;
      };
      appendingPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        auth
      );

      await service.applyAuthorizationPolicy(
        { id: 'ver-1', authorization: auth } as any,
        'account-1'
      );

      const appended: any[] =
        appendingPolicyService.appendCredentialAuthorizationRules.mock
          .calls[0][1];
      const supportRules = appended.filter((rule: any) =>
        rule.criterias?.includes(AuthorizationCredential.PLATFORM_SUPPORT)
      );
      expect(supportRules).toHaveLength(1);
      expect(supportRules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_SUPPORT,
      ]);
      expect([...supportRules[0].grantedPrivileges].sort()).toEqual(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
        ].sort()
      );
      expect(supportRules[0].grantedPrivileges).not.toContain(
        AuthorizationPrivilege.DELETE
      );
      expect(supportRules[0].cascade).toBe(false);

      const legacy = appended.filter((rule: any) =>
        rule.criterias?.includes(AuthorizationCredential.GLOBAL_ADMIN)
      );
      expect(legacy).toHaveLength(1);
      expect(legacy[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_COMMUNITY_READ,
      ]);
    });

    it('should throw EntityNotInitializedException when authorization is undefined', async () => {
      const verification = {
        id: 'ver-1',
        authorization: undefined,
      } as any;

      authorizationPolicyService.reset.mockReturnValue(undefined);

      await expect(
        service.applyAuthorizationPolicy(verification, 'account-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
