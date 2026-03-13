import { AuthorizationCredential } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { UserSettingsAuthorizationService } from '../user-settings/user.settings.service.authorization';
import { UserAuthorizationService } from './user.service.authorization';

describe('UserAuthorizationService', () => {
  let service: UserAuthorizationService;
  let userLookupService: { getUserByIdOrFail: Mock };
  let authorizationPolicyService: {
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
    appendPrivilegeAuthorizationRules: Mock;
    cloneAuthorizationPolicy: Mock;
    appendCredentialRuleAnonymousRegisteredAccess: Mock;
    appendPrivilegeAuthorizationRuleMapping: Mock;
  };
  let platformAuthorizationService: {
    inheritRootAuthorizationPolicy: Mock;
  };
  let profileAuthorizationService: { applyAuthorizationPolicy: Mock };
  let storageAggregatorAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let userSettingsAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let actorService: { grantCredentialOrFail: Mock };
  let actorLookupService: { getActorCredentialsOrFail: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserAuthorizationService);
    userLookupService = module.get(UserLookupService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as any;
    storageAggregatorAuthorizationService = module.get(
      StorageAggregatorAuthorizationService
    ) as any;
    userSettingsAuthorizationService = module.get(
      UserSettingsAuthorizationService
    ) as any;
    actorService = module.get(ActorService) as any;
    actorLookupService = module.get(ActorLookupService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when profile not loaded', async () => {
      const user = {
        id: 'user-1',
        authorization: { credentialRules: [] },
        profile: null,
        storageAggregator: { authorization: {} },
        settings: { authorization: {} },
      };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);

      await expect(service.applyAuthorizationPolicy('user-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when storageAggregator not loaded', async () => {
      const user = {
        id: 'user-1',
        authorization: { credentialRules: [] },
        profile: { authorization: {} },
        storageAggregator: null,
        settings: { authorization: {} },
      };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);

      await expect(service.applyAuthorizationPolicy('user-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when settings not loaded', async () => {
      const user = {
        id: 'user-1',
        authorization: { credentialRules: [] },
        profile: { authorization: {} },
        storageAggregator: { authorization: {} },
        settings: null,
      };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);

      await expect(service.applyAuthorizationPolicy('user-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should apply authorization policy and return updated policies', async () => {
      const authorization = { credentialRules: [] };
      const user = {
        id: 'user-1',
        authorization,
        profile: { id: 'profile-1', authorization: {} },
        storageAggregator: {
          authorization: {},
          directStorage: { authorization: {} },
        },
        settings: { authorization: {} },
      };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      authorizationPolicyService.reset.mockReturnValue(authorization);
      platformAuthorizationService.inheritRootAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        authorization
      );
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        authorization
      );
      actorLookupService.getActorCredentialsOrFail.mockResolvedValue([]);
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      userSettingsAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
        authorization
      );
      storageAggregatorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      const result = await service.applyAuthorizationPolicy('user-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include PII read rules based on user credentials', async () => {
      const authorization = { credentialRules: [] };
      const user = {
        id: 'user-1',
        authorization,
        profile: { id: 'profile-1', authorization: {} },
        storageAggregator: {
          authorization: {},
          directStorage: { authorization: {} },
        },
        settings: { authorization: {} },
      };
      userLookupService.getUserByIdOrFail.mockResolvedValue(user);
      authorizationPolicyService.reset.mockReturnValue(authorization);
      platformAuthorizationService.inheritRootAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        authorization
      );
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        authorization
      );
      // User has SPACE_MEMBER and ORGANIZATION_ASSOCIATE credentials
      actorLookupService.getActorCredentialsOrFail.mockResolvedValue([
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'space-1',
        },
        {
          type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          resourceID: 'org-1',
        },
      ]);
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      userSettingsAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
        authorization
      );
      storageAggregatorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      await service.applyAuthorizationPolicy('user-1');
      // createCredentialRule should be called with PII credentials
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });
  });

  describe('grantCredentialsAllUsersReceive', () => {
    it('should grant three credentials and return user', async () => {
      const user = { id: 'user-1', accountID: 'account-1' };
      userLookupService.getUserByIdOrFail
        .mockResolvedValueOnce(user) // first call to get accountID
        .mockResolvedValueOnce(user); // second call to return updated user
      actorService.grantCredentialOrFail.mockResolvedValue(undefined);

      const _result = await service.grantCredentialsAllUsersReceive('user-1');
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledTimes(3);
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: AuthorizationCredential.GLOBAL_REGISTERED,
        })
      );
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: 'user-1',
        })
      );
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: AuthorizationCredential.ACCOUNT_ADMIN,
          resourceID: 'account-1',
        })
      );
    });
  });
});
