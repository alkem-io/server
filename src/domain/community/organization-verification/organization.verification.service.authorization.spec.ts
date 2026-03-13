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
