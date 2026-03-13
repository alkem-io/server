import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { CommunityGuidelinesAuthorizationService } from './community.guidelines.service.authorization';

describe('CommunityGuidelinesAuthorizationService', () => {
  let service: CommunityGuidelinesAuthorizationService;
  let authorizationPolicyService: {
    reset: Mock;
    inheritParentAuthorization: Mock;
    appendCredentialRuleAnonymousRegisteredAccess: Mock;
  };
  let profileAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityGuidelinesAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityGuidelinesAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset authorization, inherit parent, append anonymous access, and apply profile authorization', async () => {
      const resetAuth = { id: 'auth-reset' };
      const inheritedAuth = { id: 'auth-inherited' };
      const anonAuth = { id: 'auth-anon' };
      const profileAuths = [{ id: 'profile-auth-1' }, { id: 'profile-auth-2' }];

      authorizationPolicyService.reset.mockReturnValue(resetAuth);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        anonAuth
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        profileAuths
      );

      const communityGuidelines = {
        authorization: { id: 'auth-original' },
        profile: { id: 'profile-1' },
      } as any;
      const parentAuthorization = { id: 'parent-auth' } as any;

      const result = await service.applyAuthorizationPolicy(
        communityGuidelines,
        parentAuthorization
      );

      // Should reset first
      expect(authorizationPolicyService.reset).toHaveBeenCalledWith({
        id: 'auth-original',
      });

      // Should inherit from parent
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuthorization);

      // Should append anonymous access with READ privilege
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).toHaveBeenCalledWith(inheritedAuth, AuthorizationPrivilege.READ);

      // Should apply profile authorization using the updated auth
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', anonAuth);

      // Result should contain the guidelines auth + profile auths
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(anonAuth);
      expect(result[1]).toBe(profileAuths[0]);
      expect(result[2]).toBe(profileAuths[1]);
    });

    it('should handle undefined parent authorization', async () => {
      const resetAuth = { id: 'auth-reset' };
      const inheritedAuth = { id: 'auth-inherited' };
      const anonAuth = { id: 'auth-anon' };

      authorizationPolicyService.reset.mockReturnValue(resetAuth);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        anonAuth
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      const communityGuidelines = {
        authorization: { id: 'auth-original' },
        profile: { id: 'profile-1' },
      } as any;

      const result = await service.applyAuthorizationPolicy(
        communityGuidelines,
        undefined
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, undefined);

      // Result should contain only the guidelines auth (no profile auths)
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(anonAuth);
    });
  });
});
