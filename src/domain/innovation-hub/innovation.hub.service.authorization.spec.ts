import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IInnovationHub } from './innovation.hub.interface';
import { InnovationHubService } from './innovation.hub.service';
import { InnovationHubAuthorizationService } from './innovation.hub.service.authorization';

describe('InnovationHubAuthorizationService', () => {
  let service: InnovationHubAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let innovationHubService: InnovationHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationHubAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationHubAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    innovationHubService = module.get(InnovationHubService);
  });

  describe('applyAuthorizationPolicy', () => {
    const mockParentAuthorization = { id: 'parent-auth' } as any;

    it('should apply authorization policy and return updated authorizations', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const hubWithProfile = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithProfile);

      const clonedAuth = { id: 'cloned-auth' };
      const clonedWithAnon = { id: 'cloned-with-anon' };
      const inheritedAuth = { id: 'inherited-auth' };
      const extendedAuth = { id: 'extended-auth' };

      (authorizationPolicyService as any).cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue(clonedAuth);
      (
        authorizationPolicyService as any
      ).appendCredentialRuleAnonymousRegisteredAccess = vi
        .fn()
        .mockReturnValue(clonedWithAnon);
      (authorizationPolicyService as any).inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(inheritedAuth);
      (authorizationPolicyService as any).createCredentialRuleUsingTypesOnly =
        vi.fn().mockReturnValue({ cascade: false });
      (authorizationPolicyService as any).appendCredentialAuthorizationRules =
        vi.fn().mockReturnValue(extendedAuth);

      const profileAuths = [{ id: 'profile-auth-1' }, { id: 'profile-auth-2' }];
      (profileAuthorizationService as any).applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue(profileAuths);

      // Act
      const result = await service.applyAuthorizationPolicy(
        hubInput,
        mockParentAuthorization
      );

      // Assert
      expect(result).toHaveLength(3); // hub auth + 2 profile auths
      expect(
        (innovationHubService as any).getInnovationHubOrFail
      ).toHaveBeenCalledWith('hub-1', {
        relations: { profile: true },
      });
    });

    it('should clone parent authorization and add anonymous read access', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const hubWithProfile = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithProfile);

      const clonedAuth = { id: 'cloned' };
      (authorizationPolicyService as any).cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue(clonedAuth);
      (
        authorizationPolicyService as any
      ).appendCredentialRuleAnonymousRegisteredAccess = vi
        .fn()
        .mockReturnValue(clonedAuth);
      (authorizationPolicyService as any).inheritParentAuthorization = vi
        .fn()
        .mockReturnValue({ id: 'inherited' });
      (authorizationPolicyService as any).createCredentialRuleUsingTypesOnly =
        vi.fn().mockReturnValue({ cascade: false });
      (authorizationPolicyService as any).appendCredentialAuthorizationRules =
        vi.fn();
      (profileAuthorizationService as any).applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.applyAuthorizationPolicy(hubInput, mockParentAuthorization);

      // Assert
      expect(
        (authorizationPolicyService as any).cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(mockParentAuthorization);
      expect(
        (authorizationPolicyService as any)
          .appendCredentialRuleAnonymousRegisteredAccess
      ).toHaveBeenCalledWith(clonedAuth, AuthorizationPrivilege.READ);
    });

    it('should throw EntityNotInitializedException when hub has no profile', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const hubWithoutProfile = {
        id: 'hub-1',
        profile: undefined,
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithoutProfile);

      // Act & Assert
      await expect(
        service.applyAuthorizationPolicy(hubInput, mockParentAuthorization)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should apply profile authorization using hub authorization', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const inheritedAuth = { id: 'inherited-auth' };
      const hubWithProfile = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithProfile);
      (authorizationPolicyService as any).cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({});
      (
        authorizationPolicyService as any
      ).appendCredentialRuleAnonymousRegisteredAccess = vi
        .fn()
        .mockReturnValue({});
      (authorizationPolicyService as any).inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(inheritedAuth);
      (authorizationPolicyService as any).createCredentialRuleUsingTypesOnly =
        vi.fn().mockReturnValue({ cascade: false });
      (authorizationPolicyService as any).appendCredentialAuthorizationRules =
        vi.fn();
      (profileAuthorizationService as any).applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.applyAuthorizationPolicy(hubInput, mockParentAuthorization);

      // Assert
      expect(
        (profileAuthorizationService as any).applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', inheritedAuth);
    });

    it('should handle undefined parent authorization', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const hubWithProfile = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithProfile);
      (authorizationPolicyService as any).cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({});
      (
        authorizationPolicyService as any
      ).appendCredentialRuleAnonymousRegisteredAccess = vi
        .fn()
        .mockReturnValue({});
      (authorizationPolicyService as any).inheritParentAuthorization = vi
        .fn()
        .mockReturnValue({});
      (authorizationPolicyService as any).createCredentialRuleUsingTypesOnly =
        vi.fn().mockReturnValue({ cascade: false });
      (authorizationPolicyService as any).appendCredentialAuthorizationRules =
        vi.fn();
      (profileAuthorizationService as any).applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([]);

      // Act
      const result = await service.applyAuthorizationPolicy(
        hubInput,
        undefined
      );

      // Assert
      expect(
        (authorizationPolicyService as any).cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(undefined);
      expect(result).toBeDefined();
    });

    it('should set cascade to true on innovation hub admin credential rule', async () => {
      // Arrange
      const hubInput = { id: 'hub-1' } as IInnovationHub;
      const hubWithProfile = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'hub-auth' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(hubWithProfile);
      (authorizationPolicyService as any).cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({});
      (
        authorizationPolicyService as any
      ).appendCredentialRuleAnonymousRegisteredAccess = vi
        .fn()
        .mockReturnValue({});
      (authorizationPolicyService as any).inheritParentAuthorization = vi
        .fn()
        .mockReturnValue({});

      const credentialRule = { cascade: false };
      (authorizationPolicyService as any).createCredentialRuleUsingTypesOnly =
        vi.fn().mockReturnValue(credentialRule);
      (authorizationPolicyService as any).appendCredentialAuthorizationRules =
        vi.fn();
      (profileAuthorizationService as any).applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.applyAuthorizationPolicy(hubInput, mockParentAuthorization);

      // Assert
      expect(credentialRule.cascade).toBe(true);
    });
  });
});
