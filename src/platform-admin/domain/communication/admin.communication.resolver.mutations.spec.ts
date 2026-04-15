import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationService } from './admin.communication.service';

describe('AdminCommunicationResolverMutations', () => {
  let resolver: AdminCommunicationResolverMutations;
  let authorizationService: Record<string, Mock>;
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
});
