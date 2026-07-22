import { GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationService } from './admin.communication.service';

describe('AdminCommunicationResolverMutations', () => {
  let resolver: AdminCommunicationResolverMutations;
  let authorizationService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let adminCommunicationService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminCommunicationResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminCommunicationResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    adminCommunicationService = module.get(AdminCommunicationService) as any;
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
  // authorization policy: GLOBAL_SUPPORT and GLOBAL_LICENSE_MANAGER hold
  // PLATFORM_ADMIN / PLATFORM_OPERATIONS_ADMIN platform-wide but have never
  // been able to run the adminCommunication* mutations, which act directly on
  // Matrix rooms across every Space. If a future change harmonises the
  // privilege names or swaps in the platform policy, these tests fail rather
  // than silently widening access. Widening is a product decision — if you are
  // here because a test failed, get sign-off before updating the expectations.
  describe('authorization policy', () => {
    it('grants COMMUNICATION_ADMIN to GLOBAL_ADMIN and PLATFORM_OPERATIONS_ADMIN only', () => {
      expect(
        authorizationPolicyService.createGlobalRolesAuthorizationPolicy
      ).toHaveBeenCalledWith(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.PLATFORM_OPERATIONS_ADMIN,
        ],
        [AuthorizationPrivilege.COMMUNICATION_ADMIN],
        GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT
      );
    });

    it('does not grant the comms family to GLOBAL_SUPPORT or GLOBAL_LICENSE_MANAGER', () => {
      const [roles] =
        authorizationPolicyService.createGlobalRolesAuthorizationPolicy.mock
          .calls[0];
      expect(roles).not.toContain(AuthorizationRoleGlobal.GLOBAL_SUPPORT);
      expect(roles).not.toContain(
        AuthorizationRoleGlobal.GLOBAL_COMMUNITY_READ
      );
    });

    it('does not reuse the platform-wide PLATFORM_OPERATIONS_ADMIN privilege as the gate', () => {
      const [, privileges] =
        authorizationPolicyService.createGlobalRolesAuthorizationPolicy.mock
          .calls[0];
      expect(privileges).not.toContain(
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN
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
    ])('%s checks COMMUNICATION_ADMIN against the comms policy', async (_name, invoke) => {
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
      expect(privilege).toBe(AuthorizationPrivilege.COMMUNICATION_ADMIN);
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
});
