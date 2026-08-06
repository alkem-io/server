import { GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationService } from './admin.communication.service';
import { AdminCommunicationSpaceSyncService } from './admin.communication.space.sync.service';

describe('AdminCommunicationResolverMutations', () => {
  let module: TestingModule;
  let resolver: AdminCommunicationResolverMutations;
  let adminCommunicationSpaceSyncService: Record<string, Mock>;
  let authorizationService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let adminCommunicationService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [AdminCommunicationResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminCommunicationResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    adminCommunicationService = module.get(AdminCommunicationService) as any;
    adminCommunicationSpaceSyncService = module.get(
      AdminCommunicationSpaceSyncService
    ) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminCommunicationEnsureAccessToCommunications', () => {
    it('should check authorization and ensure access', async () => {
      const ensureAccessData = { spaceID: 'space-1' } as any;
      adminCommunicationService.ensureCommunityAccessToCommunications.mockResolvedValue(
        true
      );

      const result =
        await resolver.adminCommunicationEnsureAccessToCommunications(
          ensureAccessData,
          actorContext
        );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        adminCommunicationService.ensureCommunityAccessToCommunications
      ).toHaveBeenCalledWith(ensureAccessData);
      expect(result).toBe(true);
    });
  });

  describe('adminCommunicationRemoveOrphanedRoom', () => {
    it('should check authorization and remove orphaned room', async () => {
      const orphanedRoomData = { roomID: 'room-1' } as any;
      adminCommunicationService.removeOrphanedRoom.mockResolvedValue(true);

      const result = await resolver.adminCommunicationRemoveOrphanedRoom(
        orphanedRoomData,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(adminCommunicationService.removeOrphanedRoom).toHaveBeenCalledWith(
        orphanedRoomData
      );
      expect(result).toBe(true);
    });
  });

  describe('adminCommunicationUpdateRoomState', () => {
    it('should check authorization and update room state', async () => {
      const roomStateData = {
        roomID: 'room-1',
        isWorldVisible: true,
        isPublic: false,
      } as any;
      const roomResult = { id: 'room-1', displayName: 'test' };
      adminCommunicationService.updateRoomState.mockResolvedValue(roomResult);

      const result = await resolver.adminCommunicationUpdateRoomState(
        roomStateData,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(adminCommunicationService.updateRoomState).toHaveBeenCalledWith(
        'room-1',
        'invite', // isPublic=false → JoinRuleInvite
        true
      );
      expect(result).toEqual(roomResult);
    });
  });

  describe('adminCommunicationMigrateOrphanedConversations', () => {
    it('should check authorization and migrate conversations', async () => {
      const migrateResult = { roomsMigrated: 5 };
      adminCommunicationService.migrateConversationRooms.mockResolvedValue(
        migrateResult
      );

      const result =
        await resolver.adminCommunicationMigrateOrphanedConversations(
          actorContext
        );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        adminCommunicationService.migrateConversationRooms
      ).toHaveBeenCalled();
      expect(result).toEqual(migrateResult);
    });
  });

  // These tests pin the grant set of the synthetic comms policy. They exist
  // because that grant set is deliberately NARROWER than the platform
  // authorization policy: the other global roles (GLOBAL_SUPPORT here, and
  // GLOBAL_LICENSE_MANAGER on the platform policy, which is not an
  // AuthorizationRoleGlobal so cannot be asserted against directly) hold
  // PLATFORM_OPERATIONS_ADMIN platform-wide but have never been able to run
  // the adminCommunication* mutations, which act directly on Matrix rooms
  // across every Space. The gate privilege is granted on THIS synthetic
  // policy only; if a future change swaps in the platform policy, these
  // tests fail rather than silently widening access. Widening is a product
  // decision — if you are here because a test failed, get sign-off before
  // updating the expectations.
  describe('authorization policy', () => {
    // 027-platform-role-redesign (T074/T076, Slice B): narrowed. `global-admin`
    // and the `PLATFORM_ADMIN` privilege are both gone from this synthetic
    // policy — they only ever preserved the develop-era grant verbatim while the
    // feature ran additively, and the resolver gates always checked
    // PLATFORM_OPERATIONS_ADMIN.
    it('grants the comms gate to PLATFORM_OPERATIONS_ADMIN alone', () => {
      expect(
        authorizationPolicyService.createGlobalRolesAuthorizationPolicy
      ).toHaveBeenCalledWith(
        [AuthorizationRoleGlobal.PLATFORM_OPERATIONS_ADMIN],
        [
          AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
          AuthorizationPrivilege.GRANT,
        ],
        GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT
      );
    });

    it('does not grant the comms family to GLOBAL_SUPPORT or GLOBAL_COMMUNITY_READ', () => {
      const [roles] =
        authorizationPolicyService.createGlobalRolesAuthorizationPolicy.mock
          .calls[0];
      expect(roles).not.toContain(AuthorizationRoleGlobal.PLATFORM_SUPPORT);
      expect(roles).not.toContain(
        AuthorizationRoleGlobal.PLATFORM_SPACES_READER
      );
    });

    it.each([
      [
        'adminCommunicationEnsureAccessToCommunications',
        () =>
          resolver.adminCommunicationEnsureAccessToCommunications(
            {} as any,
            actorContext
          ),
      ],
      [
        'adminCommunicationRemoveOrphanedRoom',
        () =>
          resolver.adminCommunicationRemoveOrphanedRoom(
            {} as any,
            actorContext
          ),
      ],
      [
        'adminCommunicationUpdateRoomState',
        () =>
          resolver.adminCommunicationUpdateRoomState(
            { roomID: 'room-1', isPublic: true, isWorldVisible: true } as any,
            actorContext
          ),
      ],
      [
        'adminCommunicationMigrateOrphanedConversations',
        () =>
          resolver.adminCommunicationMigrateOrphanedConversations(actorContext),
      ],
      [
        'adminCommunicationSyncSpaceHierarchy',
        () => resolver.adminCommunicationSyncSpaceHierarchy(actorContext),
      ],
    ])('%s checks PLATFORM_OPERATIONS_ADMIN against the comms policy', async (_name, invoke) => {
      // The policy the resolver actually holds — asserting reference
      // identity here is the point: these mutations must never be gated on
      // the platform authorization policy, which has a wider grant set.
      const commsPolicy = (resolver as any).communicationGlobalAdminPolicy;

      await invoke();

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(1);
      const [ctx, policy, privilege, reason] =
        authorizationService.grantAccessOrFail.mock.calls[0];
      expect(ctx).toBe(actorContext);
      expect(policy).toBe(commsPolicy);
      expect(privilege).toBe(AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN);
      expect(typeof reason).toBe('string');
    });

    it.each([
      [
        'adminCommunicationRemoveOrphanedRoom',
        () =>
          resolver.adminCommunicationRemoveOrphanedRoom(
            {} as any,
            actorContext
          ),
        () => adminCommunicationService.removeOrphanedRoom,
      ],
      [
        'adminCommunicationMigrateOrphanedConversations',
        () =>
          resolver.adminCommunicationMigrateOrphanedConversations(actorContext),
        () => adminCommunicationService.migrateConversationRooms,
      ],
    ])('%s does not run when the authorization check fails', async (_name, invoke, service) => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(invoke()).rejects.toThrow('Forbidden');
      expect(service()).not.toHaveBeenCalled();
    });
  });
  // ===================================================================
  // qual-server-12 (2026-07-31) — A11's five operations here each audit BOTH
  // outcomes (ten call sites, the largest concentration in the feature), and
  // none was asserted. Every one of them mutates Matrix/room state outside
  // Postgres — orphaned-room removal, room-state changes, conversation
  // migration, space-hierarchy sync — so the audit row is often the ONLY
  // record inside Alkemio that the operation happened at all.
  // ===================================================================
  describe('audit coverage (qual-server-12)', () => {
    const operationsAudit = () =>
      module.get(PlatformOperationsAuditService) as any;

    const CASES: ReadonlyArray<
      [string, () => Mock, (r: any) => Promise<unknown>, unknown]
    > = [
      [
        'adminCommunicationEnsureAccessToCommunications',
        () => adminCommunicationService.ensureCommunityAccessToCommunications,
        r =>
          r.adminCommunicationEnsureAccessToCommunications(
            { spaceID: 'space-1' } as any,
            actorContext
          ),
        true,
      ],
      [
        'adminCommunicationRemoveOrphanedRoom',
        () => adminCommunicationService.removeOrphanedRoom,
        r =>
          r.adminCommunicationRemoveOrphanedRoom(
            { roomID: 'room-1' } as any,
            actorContext
          ),
        true,
      ],
      [
        'adminCommunicationUpdateRoomState',
        () => adminCommunicationService.updateRoomState,
        r =>
          r.adminCommunicationUpdateRoomState(
            { roomID: 'room-1', isWorldVisible: true, isPublic: false } as any,
            actorContext
          ),
        { id: 'room-1', displayName: 'test' },
      ],
      [
        'adminCommunicationMigrateOrphanedConversations',
        () => adminCommunicationService.migrateConversationRooms,
        r => r.adminCommunicationMigrateOrphanedConversations(actorContext),
        true,
      ],
      [
        'adminCommunicationSyncSpaceHierarchy',
        () => adminCommunicationSpaceSyncService.syncSpaceHierarchy,
        r => r.adminCommunicationSyncSpaceHierarchy(actorContext),
        true,
      ],
    ];

    it.each(
      CASES
    )('%s records a success operation', async (action, dep, invoke, ok) => {
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

    it.each(
      CASES
    )('%s records a FAILURE operation and rethrows', async (action, dep, invoke) => {
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
