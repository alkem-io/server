import { RoleChangeType } from '@alkemio/notifications-lib';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { LicenseService } from '@domain/common/license/license.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformRoleAssignmentRulesService } from './platform.role.assignment.rules.service';
import { PlatformRoleResolverMutations } from './platform.role.resolver.mutations';

describe('PlatformRoleResolverMutations', () => {
  let resolver: PlatformRoleResolverMutations;
  let platformService: PlatformService;
  let authorizationService: AuthorizationService;
  let roleSetService: RoleSetService;
  let userLookupService: UserLookupService;
  let actorService: ActorService;
  let accountService: AccountService;
  let accountLicenseService: AccountLicenseService;
  let licenseService: LicenseService;
  let notificationPlatformAdapter: NotificationPlatformAdapter;
  let roleSetAuthorizationService: RoleSetAuthorizationService;

  const mockActorContext = {
    actorID: 'actor-1',
  } as ActorContext;

  const mockRoleSet = {
    id: 'rs-1',
    type: 'platform',
    authorization: { id: 'auth-rs' },
  };

  const mockUser = {
    id: 'user-target',
    accountID: 'account-1',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformRoleResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformRoleResolverMutations);
    platformService = module.get(PlatformService);
    authorizationService = module.get(AuthorizationService);
    roleSetService = module.get(RoleSetService);
    userLookupService = module.get(UserLookupService);
    actorService = module.get(ActorService);
    accountService = module.get(AccountService);
    accountLicenseService = module.get(AccountLicenseService);
    licenseService = module.get(LicenseService);
    notificationPlatformAdapter = module.get(NotificationPlatformAdapter);
    roleSetAuthorizationService = module.get(RoleSetAuthorizationService);
  });

  describe('assignPlatformRoleToUser', () => {
    beforeEach(() => {
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockResolvedValue(undefined);
    });

    it('should assign GLOBAL_ADMIN role with GRANT_GLOBAL_ADMINS privilege', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        expect.any(String)
      );
    });

    it('should assign BETA_TESTER role with GRANT privilege and grant license credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_BETA_TESTER,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
          resourceID: 'account-1',
        })
      );
    });

    it('should assign VC_CAMPAIGN role with GRANT privilege and grant license credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_VC_CAMPAIGN,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
    });

    // 027-platform-role-redesign (T040a, T070f): FEATURE_BETA_TESTER is
    // rule-engine-governed (a `feature-*` role), unlike its legacy
    // PLATFORM_BETA_TESTER twin — but it MUST carry the SAME beta/trial
    // license entitlement grant, or the target role is inert once Slice B
    // drops platform-beta-tester (FR-009, SC-007).
    it('grants FEATURE_BETA_TESTER (T040a) the SAME beta/trial license entitlement as legacy PLATFORM_BETA_TESTER', async () => {
      const actorContextWithCredentials = {
        actorID: 'actor-1',
        // A2's intended owners (FEATURE_ROLE_ASSIGN): platform-users-admin
        // or platform-roles-admin — required for FR-025 attribution
        // (resolveA1A2InitiatorRole) to resolve without throwing.
        credentials: [{ type: AuthorizationCredential.PLATFORM_ROLES_ADMIN }],
      } as any;
      const roleData = {
        actorID: 'user-target',
        role: RoleName.FEATURE_BETA_TESTER,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        actorContextWithCredentials,
        roleData as any
      );

      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
          resourceID: 'account-1',
        })
      );
    });

    it('should send global role change notification', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(
        notificationPlatformAdapter.platformGlobalRoleChanged
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'actor-1',
          userID: 'user-target',
          type: RoleChangeType.ADDED,
          role: RoleName.GLOBAL_ADMIN,
        })
      );
    });
  });

  describe('removePlatformRoleFromUser', () => {
    beforeEach(() => {
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockResolvedValue(undefined);
    });

    it('should remove ADMIN role with GRANT_GLOBAL_ADMINS privilege', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        expect.anything(),
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        expect.any(String)
      );
    });

    it('should remove BETA_TESTER role with GRANT privilege and revoke credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_BETA_TESTER,
      };

      (
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (actorService.revokeCredential as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        { id: 'extended-auth' },
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
      expect(actorService.revokeCredential).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        })
      );
    });

    it('should send REMOVED notification', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(
        notificationPlatformAdapter.platformGlobalRoleChanged
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RoleChangeType.REMOVED,
        })
      );
    });
  });

  // 027-platform-role-redesign (T010/fix — live-verification F-1): the
  // suite above auto-mocks `PlatformRoleAssignmentRulesService`, so it can
  // never catch a wiring defect between the resolver and the REAL rule
  // engine. This block wires the REAL rules service (only its
  // `AuthorizationService` dependency is stubbed) so rule 5's revoke-path
  // integration is actually exercised end to end, not just asserted in
  // isolation (rules.service.spec.ts) or mocked away (suite above).
  describe('removePlatformRoleFromUser — rule 5 real-engine integration', () => {
    let realResolver: PlatformRoleResolverMutations;
    let realRoleSetService: RoleSetService;
    let realAuthorizationService: AuthorizationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlatformRoleResolverMutations,
          PlatformRoleAssignmentRulesService,
          MockWinstonProvider,
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(PlatformRoleResolverMutations);
      realRoleSetService = module.get(RoleSetService);
      realAuthorizationService = module.get(AuthorizationService);

      (module.get(PlatformService).getRoleSetOrFail as Mock).mockResolvedValue(
        mockRoleSet
      );
      (realAuthorizationService.isAccessGranted as Mock).mockReturnValue(true);
      (realRoleSetService.removeActorFromRole as Mock).mockResolvedValue(
        undefined
      );
      (
        module.get(UserLookupService).getUserByIdOrFail as Mock
      ).mockResolvedValue(mockUser);
    });

    it('rejects revoking PLATFORM_ROLES_ADMIN from the sole holder', async () => {
      (realRoleSetService.countActorsWithRole as Mock).mockResolvedValue(1);

      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_ROLES_ADMIN,
      };

      await expect(
        realResolver.removePlatformRoleFromUser(
          mockActorContext,
          roleData as any
        )
      ).rejects.toThrow('cannot remove the last platform-roles-admin');

      expect(realRoleSetService.removeActorFromRole).not.toHaveBeenCalled();
    });

    it('allows revoking PLATFORM_ROLES_ADMIN when another holder remains', async () => {
      (realRoleSetService.countActorsWithRole as Mock).mockResolvedValue(2);

      const actorContextWithCredentials = {
        actorID: 'actor-1',
        credentials: [{ type: AuthorizationCredential.PLATFORM_ROLES_ADMIN }],
      } as any;
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_ROLES_ADMIN,
      };

      await realResolver.removePlatformRoleFromUser(
        actorContextWithCredentials,
        roleData as any
      );

      expect(realRoleSetService.removeActorFromRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.PLATFORM_ROLES_ADMIN,
        'user-target'
      );
    });
  });
});
