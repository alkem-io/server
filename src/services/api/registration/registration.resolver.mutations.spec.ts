import { PRIVILEGED_SESSION_WINDOW_MS } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SessionRefreshRequiredException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { RegistrationService } from './registration.service';

describe('RegistrationResolverMutations', () => {
  let resolver: RegistrationResolverMutations;
  let authorizationService: { grantAccessOrFail: Mock };
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
  let notificationExternalAdapter: { createUserPayloadFromUser: Mock };

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
    notificationExternalAdapter = module.get(
      NotificationExternalAdapter
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
    it('should check DELETE privilege and delete user', async () => {
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'John' },
      };
      userService.getUserByIdOrFail.mockResolvedValue(user);
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
          triggeredByPayload: undefined,
        })
      );
      // The admin-on-other branch never pre-resolves a payload — only the
      // self branch can safely look the initiator up post-deletion.
      expect(
        notificationExternalAdapter.createUserPayloadFromUser
      ).not.toHaveBeenCalled();
      expect(
        registrationService.deleteUserWithPendingMemberships
      ).toHaveBeenCalledWith({ ID: 'user-1' }, 'admin', 'actor-1');
    });

    it('does not fail the mutation when the notification adapter throws (best-effort)', async () => {
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'John' },
      };
      userService.getUserByIdOrFail.mockResolvedValue(user);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      registrationService.deleteUserWithPendingMemberships.mockResolvedValue(
        user
      );
      notificationPlatformAdapter.platformUserRemoved.mockRejectedValue(
        new Error('notification adapter exploded')
      );

      const result = await resolver.deleteUser(actorContext, {
        ID: 'user-1',
      });

      expect(result).toBe(user);
    });

    describe('self-deletion (actor == target)', () => {
      const selfActorContext = (issuedAt?: number) =>
        ({
          actorID: 'user-1',
          credentials: [],
          issuedAt,
        }) as any;

      it('refuses with SessionRefreshRequiredException when the session is older than the privileged window', async () => {
        const staleIssuedAt = Date.now() - PRIVILEGED_SESSION_WINDOW_MS - 1;

        await expect(
          resolver.deleteUser(selfActorContext(staleIssuedAt), {
            ID: 'user-1',
          })
        ).rejects.toThrow(SessionRefreshRequiredException);
        expect(
          registrationService.deleteUserWithPendingMemberships
        ).not.toHaveBeenCalled();
      });

      it('fails closed — refuses when issuedAt is missing', async () => {
        await expect(
          resolver.deleteUser(selfActorContext(undefined), { ID: 'user-1' })
        ).rejects.toThrow(SessionRefreshRequiredException);
      });

      it('fails closed — refuses when issuedAt is zero', async () => {
        await expect(
          resolver.deleteUser(selfActorContext(0), { ID: 'user-1' })
        ).rejects.toThrow(SessionRefreshRequiredException);
      });

      it('proceeds, pins deleteIdentity, and passes branch self when the session is fresh', async () => {
        const freshIssuedAt = Date.now() - 60_000;
        const user = {
          id: 'user-1',
          authorization: { id: 'auth-1' },
          profile: { displayName: 'Self' },
        };
        userService.getUserByIdOrFail.mockResolvedValue(user);
        authorizationService.grantAccessOrFail.mockReturnValue(undefined);
        registrationService.deleteUserWithPendingMemberships.mockResolvedValue(
          user
        );
        notificationPlatformAdapter.platformUserRemoved.mockResolvedValue(
          undefined
        );
        const preResolvedPayload = { id: 'user-1' };
        notificationExternalAdapter.createUserPayloadFromUser.mockReturnValue(
          preResolvedPayload
        );

        const result = await resolver.deleteUser(
          selfActorContext(freshIssuedAt),
          { ID: 'user-1', deleteIdentity: false }
        );

        expect(result).toBe(user);
        expect(
          registrationService.deleteUserWithPendingMemberships
        ).toHaveBeenCalledWith(
          { ID: 'user-1', deleteIdentity: true },
          'self',
          'user-1'
        );
        // The self branch pre-resolves the initiator's notification payload
        // from the still-loaded pre-deletion entity, BEFORE the deletion
        // call — a post-deletion lookup by id would fail, since the
        // initiator IS the departed user.
        expect(
          notificationExternalAdapter.createUserPayloadFromUser
        ).toHaveBeenCalledWith(user);
        expect(
          notificationPlatformAdapter.platformUserRemoved
        ).toHaveBeenCalledWith(
          expect.objectContaining({ triggeredByPayload: preResolvedPayload })
        );
      });

      it('does not gate an admin deleting someone else even with a stale/missing issuedAt', async () => {
        const user = {
          id: 'other-user',
          authorization: { id: 'auth-1' },
          profile: { displayName: 'Other' },
        };
        userService.getUserByIdOrFail.mockResolvedValue(user);
        authorizationService.grantAccessOrFail.mockReturnValue(undefined);
        registrationService.deleteUserWithPendingMemberships.mockResolvedValue(
          user
        );
        notificationPlatformAdapter.platformUserRemoved.mockResolvedValue(
          undefined
        );

        const staleAdminContext = {
          actorID: 'admin-1',
          credentials: [],
          issuedAt: undefined,
        } as any;

        const result = await resolver.deleteUser(staleAdminContext, {
          ID: 'other-user',
        });

        expect(result).toBe(user);
        expect(
          registrationService.deleteUserWithPendingMemberships
        ).toHaveBeenCalledWith({ ID: 'other-user' }, 'admin', 'admin-1');
      });
    });
  });

  describe('deleteOrganization', () => {
    it('should check DELETE privilege and delete organization', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      registrationService.deleteOrganizationWithPendingMemberships.mockResolvedValue(
        org
      );

      const result = await resolver.deleteOrganization(actorContext, {
        ID: 'org-1',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(result).toBe(org);
    });
  });
});
