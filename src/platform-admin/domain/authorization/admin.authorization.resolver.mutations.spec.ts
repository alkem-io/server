import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
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
    virtualContributorService = module.get(VirtualContributorService) as any;
    spaceService = module.get(SpaceService) as any;
    entityManager = mockEntityManager as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // 027-platform-role-redesign (T080, Slice B, FR-022): the suites for the
  // four credential mutations — and the `FR-022 pin` suite that proved
  // platform-roles-admin could not reach them — are deleted with the
  // mutations themselves. There is no Slice B assertion to leave behind
  // here: a resolver cannot be tested for denying a method it no longer has,
  // and the surface's absence is asserted where absence is checkable — the
  // GraphQL schema diff (T083) and the `test-suites` denial cells.
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
