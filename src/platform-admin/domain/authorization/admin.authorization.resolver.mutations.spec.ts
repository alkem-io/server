import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationService } from './admin.authorization.service';

describe('AdminAuthorizationResolverMutations', () => {
  let resolver: AdminAuthorizationResolverMutations;
  let authorizationService: Record<string, Mock>;
  let adminAuthorizationService: Record<string, Mock>;
  let platformAuthorizationPolicyService: Record<string, Mock>;
  let authResetService: Record<string, Mock>;
  let notificationPlatformAdapter: Record<string, Mock>;
  let virtualContributorService: Record<string, Mock>;
  let spaceService: Record<string, Mock>;
  let entityManager: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthorizationResolverMutations,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminAuthorizationResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    adminAuthorizationService = module.get(AdminAuthorizationService) as any;
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    authResetService = module.get(AuthResetService) as any;
    notificationPlatformAdapter = module.get(
      NotificationPlatformAdapter
    ) as any;
    virtualContributorService = module.get(VirtualContributorService) as any;
    spaceService = module.get(SpaceService) as any;
    entityManager = mockEntityManager as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('grantCredentialToUser', () => {
    it('should check authorization, grant credential, and notify', async () => {
      const user = { id: 'user-1' };
      const grantData = { type: 'global-admin', userID: 'user-1' } as any;
      adminAuthorizationService.grantCredentialToUser.mockResolvedValue(user);
      notificationPlatformAdapter.platformGlobalRoleChanged.mockResolvedValue(
        undefined
      );

      const result = await resolver.grantCredentialToUser(
        grantData,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        adminAuthorizationService.grantCredentialToUser
      ).toHaveBeenCalledWith(grantData);
      expect(result).toEqual(user);
    });
  });

  describe('revokeCredentialFromUser', () => {
    it('should check authorization, revoke credential, and notify', async () => {
      const user = { id: 'user-1' };
      const revokeData = { type: 'global-admin', userID: 'user-1' } as any;
      adminAuthorizationService.revokeCredentialFromUser.mockResolvedValue(
        user
      );
      notificationPlatformAdapter.platformGlobalRoleChanged.mockResolvedValue(
        undefined
      );

      const result = await resolver.revokeCredentialFromUser(
        revokeData,
        actorContext
      );

      expect(
        adminAuthorizationService.revokeCredentialFromUser
      ).toHaveBeenCalledWith(revokeData);
      expect(result).toEqual(user);
    });
  });

  describe('grantCredentialToOrganization', () => {
    it('should check authorization and grant credential', async () => {
      const org = { id: 'org-1' };
      const grantData = {
        type: 'global-admin',
        organizationID: 'org-1',
      } as any;
      adminAuthorizationService.grantCredentialToOrganization.mockResolvedValue(
        org
      );

      const result = await resolver.grantCredentialToOrganization(
        grantData,
        actorContext
      );

      expect(
        adminAuthorizationService.grantCredentialToOrganization
      ).toHaveBeenCalledWith(grantData);
      expect(result).toEqual(org);
    });
  });

  describe('revokeCredentialFromOrganization', () => {
    it('should check authorization and revoke credential', async () => {
      const org = { id: 'org-1' };
      const revokeData = {
        type: 'global-admin',
        organizationID: 'org-1',
      } as any;
      adminAuthorizationService.revokeCredentialFromOrganization.mockResolvedValue(
        org
      );

      const result = await resolver.revokeCredentialFromOrganization(
        revokeData,
        actorContext
      );

      expect(
        adminAuthorizationService.revokeCredentialFromOrganization
      ).toHaveBeenCalledWith(revokeData);
      expect(result).toEqual(org);
    });
  });

  describe('authorizationPolicyResetAll', () => {
    it('should check platform authorization and publish reset', async () => {
      const platformPolicy = { id: 'platform-auth' };
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      authResetService.publishResetAll.mockResolvedValue('reset-published');

      const result = await resolver.authorizationPolicyResetAll(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(authResetService.publishResetAll).toHaveBeenCalled();
      expect(result).toBe('reset-published');
    });
  });

  describe('authorizationPlatformRolesAccessReset', () => {
    it('should reset platform roles access on all L0 spaces', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const spaces = [{ id: 'space-1' }, { id: 'space-2' }];
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      entityManager.find.mockResolvedValue(spaces);

      const result =
        await resolver.authorizationPlatformRolesAccessReset(actorContext);

      expect(
        spaceService.updatePlatformRolesAccessRecursively
      ).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });
  });

  describe('authorizationPolicyResetToGlobalAdminsAccess', () => {
    it('should extend policy and reset authorization', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const extendedPolicy = { id: 'extended-policy' };
      const resetPolicy = { id: 'reset-auth' };
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      adminAuthorizationService.extendAuthorizationPolicyWithAuthorizationReset.mockReturnValue(
        extendedPolicy
      );
      adminAuthorizationService.resetAuthorizationPolicy.mockResolvedValue(
        resetPolicy
      );

      const result =
        await resolver.authorizationPolicyResetToGlobalAdminsAccess(
          actorContext,
          'auth-id-1'
        );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        extendedPolicy,
        AuthorizationPrivilege.AUTHORIZATION_RESET,
        expect.any(String)
      );
      expect(
        adminAuthorizationService.resetAuthorizationPolicy
      ).toHaveBeenCalledWith('auth-id-1');
      expect(result).toEqual(resetPolicy);
    });
  });

  describe('refreshAllBodiesOfKnowledge', () => {
    it('should check platform auth and refresh all bodies of knowledge', async () => {
      const platformPolicy = { id: 'platform-auth' };
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      virtualContributorService.refreshAllBodiesOfKnowledge.mockResolvedValue(
        true
      );

      const result = await resolver.refreshAllBodiesOfKnowledge(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(
        virtualContributorService.refreshAllBodiesOfKnowledge
      ).toHaveBeenCalledWith(actorContext);
      expect(result).toBe(true);
    });
  });
});
