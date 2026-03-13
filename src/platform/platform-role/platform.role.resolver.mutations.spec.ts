import { RoleChangeType } from '@alkemio/notifications-lib';
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
});
