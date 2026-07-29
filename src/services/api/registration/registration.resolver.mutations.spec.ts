import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { RegistrationService } from './registration.service';

describe('RegistrationResolverMutations', () => {
  let resolver: RegistrationResolverMutations;
  let authorizationService: { grantAccessOrFail: Mock; isAccessGranted: Mock };
  let platformAuthorizationService: {
    getPlatformAuthorizationPolicy: Mock;
  };
  let userService: { createUser: Mock; getUserByIdOrFail: Mock };
  let registrationService: {
    finalizeUserRegistration: Mock;
    deleteUserWithPendingMemberships: Mock;
    deleteOrganizationWithPendingMemberships: Mock;
  };
  let organizationService: {
    createOrganization: Mock;
    getOrganizationOrFail: Mock;
    getAccount: Mock;
  };
  let organizationAuthorizationService: { applyAuthorizationPolicy: Mock };
  let accountAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: { saveAll: Mock };
  let notificationPlatformAdapter: { platformUserRemoved: Mock };

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RegistrationResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    userService = module.get(UserService) as any;
    registrationService = module.get(RegistrationService) as any;
    organizationService = module.get(OrganizationService) as any;
    organizationAuthorizationService = module.get(
      OrganizationAuthorizationService
    ) as any;
    accountAuthorizationService = module.get(
      AccountAuthorizationService
    ) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    notificationPlatformAdapter = module.get(
      NotificationPlatformAdapter
    ) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createUser', () => {
    it('should check CREATE privilege and create user', async () => {
      const platformAuth = { id: 'platform-auth' };
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      const createdUser = { id: 'user-1' };
      userService.createUser.mockResolvedValue(createdUser);
      registrationService.finalizeUserRegistration.mockResolvedValue(undefined);
      userService.getUserByIdOrFail.mockResolvedValue(createdUser);

      const result = await resolver.createUser(actorContext, {
        nameID: 'john',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformAuth,
        AuthorizationPrivilege.CREATE,
        expect.any(String)
      );
      expect(result).toBe(createdUser);
      expect(registrationService.finalizeUserRegistration).toHaveBeenCalledWith(
        createdUser
      );
    });
  });

  describe('createOrganization', () => {
    it('should check CREATE_ORGANIZATION privilege and create organization', async () => {
      const platformAuth = { id: 'platform-auth' };
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      const createdOrg = { id: 'org-1' };
      organizationService.createOrganization.mockResolvedValue(createdOrg);
      organizationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      const orgAccount = { id: 'acc-1' };
      organizationService.getAccount.mockResolvedValue(orgAccount);
      accountAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      organizationService.getOrganizationOrFail.mockResolvedValue(createdOrg);

      const result = await resolver.createOrganization(actorContext, {
        nameID: 'my-org',
        profileData: { displayName: 'My Org' },
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformAuth,
        AuthorizationPrivilege.CREATE_ORGANIZATION,
        expect.any(String)
      );
      expect(result).toBe(createdOrg);
    });
  });

  describe('deleteUser', () => {
    it('should check DELETE privilege (against the resolver-local legacy-admin policy, NOT user.authorization — spec-server-1 follow-through fix) and delete user', async () => {
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'John' },
      };
      userService.getUserByIdOrFail.mockResolvedValue(user);
      // 027-platform-role-redesign (T062): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      authorizationService.isAccessGranted.mockReturnValue(false);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      registrationService.deleteUserWithPendingMemberships.mockResolvedValue(
        user
      );
      notificationPlatformAdapter.platformUserRemoved.mockResolvedValue(
        undefined
      );

      const result = await resolver.deleteUser(actorContext, {
        ID: 'user-1',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      // NOT `user.authorization` — since the root content rule now cascades
      // DELETE platform-wide (FR-004), checking the merged, cascaded
      // `user.authorization` here would let a Content Full Access holder
      // delete any user account (A5 is outside SC-004's single accepted
      // exception, closed at A6/A7 only). The legacy-admin branch is pinned
      // to `legacyGlobalAdminDeleteUserPolicy` instead.
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        actorContext,
        user.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(result).toBe(user);
      expect(
        notificationPlatformAdapter.platformUserRemoved
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'actor-1',
          user,
        })
      );
    });

    it('allows a user to delete their own account by actor-identity comparison, without consulting the legacy-admin policy', async () => {
      const user = {
        id: 'actor-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Self' },
      };
      userService.getUserByIdOrFail.mockResolvedValue(user);
      authorizationService.isAccessGranted.mockReturnValue(false);
      registrationService.deleteUserWithPendingMemberships.mockResolvedValue(
        user
      );
      notificationPlatformAdapter.platformUserRemoved.mockResolvedValue(
        undefined
      );

      const result = await resolver.deleteUser(actorContext, {
        ID: 'actor-1',
      });

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(result).toBe(user);
    });
  });

  describe('deleteOrganization', () => {
    // 027-platform-role-redesign (T041, A6, research D5, FR-007(e)): the
    // dual-path gate — an ordinary owner keeps plain DELETE, and
    // platform-support reaches the same mutation through its own
    // DELETE_ORGANIZATION privilege. Neither `isAccessGranted` check alone
    // is sufficient; either satisfies the mutation, and `grantAccessOrFail`
    // (which throws) is only invoked when BOTH are false.
    it('should check DELETE privilege and delete organization when neither dual-path check is pre-satisfied', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.isAccessGranted.mockReturnValue(false);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      registrationService.deleteOrganizationWithPendingMemberships.mockResolvedValue(
        org
      );

      const result = await resolver.deleteOrganization(actorContext, {
        ID: 'org-1',
      });

      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.DELETE
      );
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.DELETE_ORGANIZATION
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(result).toBe(org);
    });

    it('should delete as owner via plain DELETE without calling grantAccessOrFail', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.isAccessGranted.mockImplementation(
        (_actor, _auth, privilege) =>
          privilege === AuthorizationPrivilege.DELETE
      );
      registrationService.deleteOrganizationWithPendingMemberships.mockResolvedValue(
        org
      );

      const result = await resolver.deleteOrganization(actorContext, {
        ID: 'org-1',
      });

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(result).toBe(org);
    });

    it('should delete as platform-support via DELETE_ORGANIZATION without calling grantAccessOrFail', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.isAccessGranted.mockImplementation(
        (_actor, _auth, privilege) =>
          privilege === AuthorizationPrivilege.DELETE_ORGANIZATION
      );
      registrationService.deleteOrganizationWithPendingMemberships.mockResolvedValue(
        org
      );

      const result = await resolver.deleteOrganization(actorContext, {
        ID: 'org-1',
      });

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(result).toBe(org);
    });
  });

  // 027-platform-role-redesign (sec-server-4 fix): wires the REAL
  // AuthorizationPolicyService + AuthorizationService so the constructor's
  // `platformUsersAdminDeleteUserPolicy` is a genuine, hardcoded
  // [PLATFORM_USERS_ADMIN]-only policy — NOT `user.authorization`, whose
  // PLATFORM_USERS_ADMIN grant set additively admits global-support/
  // global-license-manager/global-platform-manager too (A4's legacy
  // reachers). None of those three ever held deleteUser pre-feature.
  describe('deleteUser — platform-users-admin pin, real-engine integration', () => {
    let realResolver: RegistrationResolverMutations;
    let realUserService: Record<string, Mock>;
    let realRegistrationService: Record<string, Mock>;

    const targetUser = {
      id: 'user-target',
      authorization: { id: 'auth-user-target' },
      profile: { displayName: 'Target' },
    };

    const buildActorContext = (credentialType?: string): any => ({
      actorID: 'actor-1',
      credentials: credentialType
        ? [{ type: credentialType, resourceID: '' }]
        : [],
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RegistrationResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
        ],
      })
        .useMocker(token => {
          if (token === ConfigService) {
            return { get: vi.fn().mockReturnValue(500) };
          }
          return defaultMockerFactory(token);
        })
        .compile();

      realResolver = module.get(RegistrationResolverMutations);
      realUserService = module.get(UserService) as any;
      realRegistrationService = module.get(RegistrationService) as any;

      realUserService.getUserByIdOrFail.mockResolvedValue(targetUser);
      realRegistrationService.deleteUserWithPendingMemberships.mockResolvedValue(
        targetUser
      );
    });

    it('denies a global-support-only actor (never held deleteUser pre-feature)', async () => {
      const actor = buildActorContext('global-support');
      await expect(
        realResolver.deleteUser(actor, { ID: 'user-target' })
      ).rejects.toThrow();
    });

    it('denies a global-license-manager-only actor (never held deleteUser pre-feature)', async () => {
      const actor = buildActorContext('global-license-manager');
      await expect(
        realResolver.deleteUser(actor, { ID: 'user-target' })
      ).rejects.toThrow();
    });

    it('allows a platform-users-admin actor (the new owning role)', async () => {
      const actor = buildActorContext('platform-users-admin');
      await expect(
        realResolver.deleteUser(actor, { ID: 'user-target' })
      ).resolves.toBeDefined();
    });
  });
});
