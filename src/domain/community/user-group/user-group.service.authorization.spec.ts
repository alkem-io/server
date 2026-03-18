import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { UserGroupService } from './user-group.service';
import { UserGroupAuthorizationService } from './user-group.service.authorization';

describe('UserGroupAuthorizationService', () => {
  let service: UserGroupAuthorizationService;
  let authorizationPolicyService: {
    inheritParentAuthorization: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
  };
  let profileAuthorizationService: { applyAuthorizationPolicy: Mock };
  let userGroupService: { getProfile: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupAuthorizationService,
        repositoryProviderMockFactory(UserGroup),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserGroupAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as any;
    userGroupService = module.get(UserGroupService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization, extend rules, and cascade to profile', async () => {
      const mockAuth = { id: 'auth-1' };
      const parentAuth = { id: 'parent-auth' };
      const mockProfile = { id: 'profile-1' };
      const profileAuthorizations = [{ id: 'profile-auth' }];
      const credentialRule = { type: 'rule-1' };

      const userGroup = {
        id: 'group-1',
        authorization: mockAuth,
        profile: mockProfile,
      } as any;

      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        mockAuth
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue(
        credentialRule
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        mockAuth
      );
      userGroupService.getProfile.mockReturnValue(mockProfile);
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        profileAuthorizations
      );

      const result = await service.applyAuthorizationPolicy(
        userGroup,
        parentAuth as any
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, parentAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', mockAuth);
      // Should include both the group auth and profile authorizations
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockAuth);
    });

    it('should throw EntityNotInitializedException when authorization is undefined', async () => {
      const userGroup = {
        id: 'group-1',
        authorization: undefined,
        profile: { id: 'profile-1' },
      } as any;

      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        undefined
      );

      await expect(
        // The extendCredentialRules method is private but it throws when auth is undefined
        // We need to trigger applyAuthorizationPolicy which calls it
        service.applyAuthorizationPolicy(userGroup, undefined)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
