import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationService } from './admin.authorization.service';

describe('AdminAuthorizationResolverMutations', () => {
  let module: TestingModule;
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
    vi.restoreAllMocks();

    const mockEntityManager = {
      find: vi.fn(),
    };

    module = await Test.createTestingModule({
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
        AuthorizationPrivilege.AUTHORIZATION_RESET,
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
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
        expect.any(String)
      );
      expect(
        virtualContributorService.refreshAllBodiesOfKnowledge
      ).toHaveBeenCalledWith(actorContext);
      expect(result).toBe(true);
    });
  });

  // 027-platform-role-redesign (T034a, research C10/D24, thirteenth analyze
  // pass): the four FR-022 credential mutations ride a resolver-local,
  // hardcoded IN_MEMORY authorization policy (`authorizationGlobalAdminPolicy`,
  // built once in the constructor from a fixed one-element
  // `[AuthorizationRoleGlobal.GLOBAL_ADMIN]` array) — entirely decoupled
  // from the platform authorization policy's GRANT_GLOBAL_ADMINS credential
  // rule that T034 widens to platform-roles-admin. This suite proves that
  // decoupling holds with REAL AuthorizationPolicyService/AuthorizationService
  // instances (no mocked grant check): platform-roles-admin alone MUST be
  // denied all four, and legacy global-admin MUST still be granted.
  describe('FR-022 pin: grant/revokeCredentialTo{User,Organization} stay global-admin-only in Slice A', () => {
    let realResolver: AdminAuthorizationResolverMutations;
    let realAdminAuthorizationService: Record<string, Mock>;

    const buildActorContext = (
      credentialType: AuthorizationCredential
    ): ActorContext =>
      ({
        actorID: 'actor-1',
        credentials: [{ type: credentialType, resourceID: '' }],
      }) as any as ActorContext;

    beforeEach(async () => {
      const mockEntityManager = { find: vi.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminAuthorizationResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
          {
            provide: getEntityManagerToken('default'),
            useValue: mockEntityManager,
          },
        ],
      })
        .useMocker(token => {
          if (token === ConfigService) {
            return { get: vi.fn().mockReturnValue(500) };
          }
          return defaultMockerFactory(token);
        })
        .compile();

      realResolver = module.get(AdminAuthorizationResolverMutations);
      realAdminAuthorizationService = module.get(
        AdminAuthorizationService
      ) as any;
    });

    it('denies grantCredentialToUser to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.grantCredentialToUser(
          { type: 'global-admin', userID: 'user-1' } as any,
          actor
        )
      ).rejects.toThrow();
      expect(
        realAdminAuthorizationService.grantCredentialToUser
      ).not.toHaveBeenCalled();
    });

    it('denies revokeCredentialFromUser to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.revokeCredentialFromUser(
          { type: 'global-admin', userID: 'user-1' } as any,
          actor
        )
      ).rejects.toThrow();
    });

    it('denies grantCredentialToOrganization to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.grantCredentialToOrganization(
          { type: 'global-admin', organizationID: 'org-1' } as any,
          actor
        )
      ).rejects.toThrow();
    });

    it('denies revokeCredentialFromOrganization to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.revokeCredentialFromOrganization(
          { type: 'global-admin', organizationID: 'org-1' } as any,
          actor
        )
      ).rejects.toThrow();
    });

    it('still grants grantCredentialToUser to a legacy global-admin actor', async () => {
      const actor = buildActorContext(AuthorizationCredential.GLOBAL_ADMIN);
      const user = { id: 'user-1' };
      realAdminAuthorizationService.grantCredentialToUser.mockResolvedValue(
        user
      );

      const result = await realResolver.grantCredentialToUser(
        { type: 'global-admin', userID: 'user-1' } as any,
        actor
      );

      expect(result).toEqual(user);
    });
  });
  // ===================================================================
  // qual-server-12 (2026-07-31) — A3/A11's four operations here each audit
  // BOTH outcomes (eight call sites), none asserted. These are the most
  // consequential operations on the platform: `authorizationPolicyResetAll`
  // republishes every policy, `authorizationPlatformRolesAccessReset`
  // recomputes visibility on every L0 space. If one of those half-runs and
  // throws, the failure row is the only durable evidence it was ever
  // attempted — and nothing was checking the row is written.
  // ===================================================================
  describe('audit coverage (qual-server-12)', () => {
    const operationsAudit = () =>
      module.get(PlatformOperationsAuditService) as any;
    const platformPolicy = { id: 'platform-auth' };

    beforeEach(() => {
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
    });

    it.each([
      [
        'authorizationPolicyResetAll',
        () => authResetService.publishResetAll,
        (r: any) => r.authorizationPolicyResetAll(actorContext),
        'reset-published',
      ],
      [
        'authorizationPlatformRolesAccessReset',
        () => entityManager.find,
        (r: any) => r.authorizationPlatformRolesAccessReset(actorContext),
        [],
      ],
      [
        'authorizationPolicyResetToGlobalAdminsAccess',
        () => adminAuthorizationService.resetAuthorizationPolicy,
        (r: any) =>
          r.authorizationPolicyResetToGlobalAdminsAccess(
            actorContext,
            'auth-id-1'
          ),
        { id: 'reset-auth' },
      ],
      [
        'refreshAllBodiesOfKnowledge',
        () => virtualContributorService.refreshAllBodiesOfKnowledge,
        (r: any) => r.refreshAllBodiesOfKnowledge(actorContext),
        [],
      ],
    ])('%s records a success operation', async (action, dep, invoke, ok) => {
      dep().mockResolvedValue(ok);

      await invoke(resolver);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          actorID: actorContext.actorID,
          action,
          outcome: 'success',
        })
      );
    });

    it.each([
      [
        'authorizationPolicyResetAll',
        () => authResetService.publishResetAll,
        (r: any) => r.authorizationPolicyResetAll(actorContext),
      ],
      [
        'authorizationPlatformRolesAccessReset',
        () => entityManager.find,
        (r: any) => r.authorizationPlatformRolesAccessReset(actorContext),
      ],
      [
        'authorizationPolicyResetToGlobalAdminsAccess',
        () => adminAuthorizationService.resetAuthorizationPolicy,
        (r: any) =>
          r.authorizationPolicyResetToGlobalAdminsAccess(
            actorContext,
            'auth-id-1'
          ),
      ],
      [
        'refreshAllBodiesOfKnowledge',
        () => virtualContributorService.refreshAllBodiesOfKnowledge,
        (r: any) => r.refreshAllBodiesOfKnowledge(actorContext),
      ],
    ])('%s records a FAILURE operation and rethrows', async (action, dep, invoke) => {
      const failure = new Error(`${action} exploded`);
      dep().mockRejectedValue(failure);

      await expect(invoke(resolver)).rejects.toBe(failure);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          outcome: 'failure',
          error: failure,
        })
      );
    });
  });
});
