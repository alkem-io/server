import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
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

  // workspace#032: privilege hardening for the Platform Operations Admin role.
  describe('PLATFORM_OPERATIONS_ADMIN credential hardening', () => {
    const arrange = () => {
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
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockImplementation(
        (privileges, types, name) => ({
          grantedPrivileges: privileges,
          criterias: types,
          name,
          cascade: true,
        })
      );
      authorizationPolicyService.createCredentialRule.mockImplementation(
        (privileges, criterias, name) => ({
          grantedPrivileges: privileges,
          criterias,
          name,
          cascade: true,
        })
      );
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
    };

    const privilegesGrantedToRole = () => {
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
      for (const [privileges, criterias] of authorizationPolicyService
        .createCredentialRule.mock.calls) {
        if (
          criterias.some(
            (c: { type: AuthorizationCredential }) =>
              c.type === AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN
          )
        ) {
          for (const p of privileges) {
            granted.add(p);
          }
        }
      }
      return granted;
    };

    it('grants the role exactly AUTHORIZATION_RESET on user policies, on a non-cascading rule', async () => {
      arrange();

      await service.applyAuthorizationPolicy('user-1');

      expect(privilegesGrantedToRole()).toEqual(
        new Set([AuthorizationPrivilege.AUTHORIZATION_RESET])
      );

      const roleRules =
        authorizationPolicyService.createCredentialRuleUsingTypesOnly.mock.results
          .map(r => r.value)
          .filter(rule =>
            rule.criterias?.includes?.(
              AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN
            )
          );
      for (const rule of roleRules) {
        expect(rule.cascade).toBe(false);
      }
    });

    it('never grants the role identity/PII or admin privileges on user policies', async () => {
      arrange();

      await service.applyAuthorizationPolicy('user-1');

      const granted = privilegesGrantedToRole();
      for (const excluded of [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.READ_USER_PII,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ]) {
        expect(granted).not.toContain(excluded);
      }
    });
  });

  // 027-platform-role-redesign (T060, A4/A5, T070f): PLATFORM_USERS_ADMIN on
  // the per-USER authorization tree — the union of A4's legacy reachers
  // (today's PLATFORM_ADMIN) and A5's (today's PLATFORM_SETTINGS_ADMIN).
  describe('027-platform-role-redesign — PLATFORM_USERS_ADMIN grant-set widening (T060, T070f)', () => {
    const arrange = () => {
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
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockImplementation(
        (privileges, types, name) => ({
          grantedPrivileges: privileges,
          criterias: types,
          name,
          cascade: true,
        })
      );
      authorizationPolicyService.createCredentialRule.mockImplementation(
        (privileges, criterias, name) => ({
          grantedPrivileges: privileges,
          criterias,
          name,
          cascade: true,
        })
      );
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
    };

    it('grants PLATFORM_USERS_ADMIN EXACTLY {platform-users-admin} plus the union of A4 and A5 legacy reachers, non-cascading', async () => {
      arrange();
      await service.applyAuthorizationPolicy('user-1');

      const rules =
        authorizationPolicyService.createCredentialRuleUsingTypesOnly.mock.results
          .map(r => r.value)
          .filter(rule =>
            rule.grantedPrivileges?.includes(
              AuthorizationPrivilege.PLATFORM_USERS_ADMIN
            )
          );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('extends READ_USER_SETTINGS additively to platform-users-admin, keeping the pre-existing legacy reach (cascading)', async () => {
      arrange();
      await service.applyAuthorizationPolicy('user-1');

      const rules =
        authorizationPolicyService.createCredentialRuleUsingTypesOnly.mock.results
          .map(r => r.value)
          .filter(rule =>
            rule.grantedPrivileges?.includes(
              AuthorizationPrivilege.READ_USER_SETTINGS
            )
          );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_COMMUNITY_READ,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
      ]);
      expect(rules[0].cascade).toBe(true);
    });

    it('extends READ_USER_PII additively to platform-users-admin (the dynamic per-user credential list), keeping self/global-admin/global-support/global-community-read', async () => {
      arrange();
      await service.applyAuthorizationPolicy('user-1');

      const piiRuleCall =
        authorizationPolicyService.createCredentialRule.mock.calls.find(call =>
          (call[0] as AuthorizationPrivilege[]).includes(
            AuthorizationPrivilege.READ_USER_PII
          )
        );
      expect(piiRuleCall).toBeDefined();
      const piiCredentialTypes = (
        piiRuleCall![1] as { type: AuthorizationCredential }[]
      ).map(c => c.type);

      expect(piiCredentialTypes).toContain(
        AuthorizationCredential.PLATFORM_USERS_ADMIN
      );
      expect(piiCredentialTypes).toContain(
        AuthorizationCredential.GLOBAL_ADMIN
      );
      expect(piiCredentialTypes).toContain(
        AuthorizationCredential.GLOBAL_SUPPORT
      );
      expect(piiCredentialTypes).toContain(
        AuthorizationCredential.GLOBAL_COMMUNITY_READ
      );
    });
  });
});
