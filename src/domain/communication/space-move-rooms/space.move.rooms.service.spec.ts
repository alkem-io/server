import { RoomType } from '@common/enums/room.type';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { SpaceMoveRoomsService } from './space.move.rooms.service';

describe('SpaceMoveRoomsService', () => {
  let service: SpaceMoveRoomsService;
  let spaceLookupService: Mocked<SpaceLookupService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let roomService: Mocked<RoomService>;
  let communicationService: Mocked<CommunicationService>;
  let entityManager: Mocked<EntityManager>;

  const mockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceMoveRoomsService, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === EntityManager) {
          return {
            createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder()),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(SpaceMoveRoomsService);
    spaceLookupService = module.get(SpaceLookupService);
    communicationAdapter = module.get(CommunicationAdapter);
    roomService = module.get(RoomService);
    communicationService = module.get(CommunicationService);
    entityManager = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── T009: Membership revocation tests ──────────────────────────────────

  describe('revokeRoomMembershipsForActors', () => {
    it('should call batchRemoveMember once per actor with all room IDs', () => {
      const actorIds = ['actor-1', 'actor-2'];
      const roomIds = ['room-1', 'room-2', 'room-3'];

      service.revokeRoomMembershipsForActors(actorIds, roomIds);

      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledTimes(2);
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
        'actor-1',
        roomIds,
        'cross-L0-move'
      );
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
        'actor-2',
        roomIds,
        'cross-L0-move'
      );
    });

    it('should use O(actors) calls not O(actors x rooms)', () => {
      const actorIds = ['actor-1', 'actor-2', 'actor-3'];
      const roomIds = ['room-1', 'room-2', 'room-3', 'room-4', 'room-5'];

      service.revokeRoomMembershipsForActors(actorIds, roomIds);

      // 3 calls (one per actor), not 15 (actors × rooms)
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledTimes(3);
    });

    it('should not throw when adapter rejects (fire-and-forget)', async () => {
      communicationAdapter.batchRemoveMember.mockRejectedValue(
        new Error('Adapter failure')
      );

      // Should not throw
      expect(() =>
        service.revokeRoomMembershipsForActors(['actor-1'], ['room-1'])
      ).not.toThrow();

      // Wait for the promise to settle
      await vi.waitFor(() => {
        expect(communicationAdapter.batchRemoveMember).toHaveBeenCalled();
      });
    });
  });

  describe('revokeSpaceMembershipsForActors', () => {
    it('should call batchRemoveSpaceMember once per actor with all space IDs', () => {
      const actorIds = ['actor-1', 'actor-2'];
      const spaceIds = ['space-1', 'space-2'];

      service.revokeSpaceMembershipsForActors(actorIds, spaceIds);

      expect(communicationAdapter.batchRemoveSpaceMember).toHaveBeenCalledTimes(
        2
      );
      expect(communicationAdapter.batchRemoveSpaceMember).toHaveBeenCalledWith(
        'actor-1',
        spaceIds,
        'cross-L0-move'
      );
      expect(communicationAdapter.batchRemoveSpaceMember).toHaveBeenCalledWith(
        'actor-2',
        spaceIds,
        'cross-L0-move'
      );
    });

    it('should not throw when adapter rejects (fire-and-forget)', async () => {
      communicationAdapter.batchRemoveSpaceMember.mockRejectedValue(
        new Error('Adapter failure')
      );

      expect(() =>
        service.revokeSpaceMembershipsForActors(['actor-1'], ['space-1'])
      ).not.toThrow();

      await vi.waitFor(() => {
        expect(communicationAdapter.batchRemoveSpaceMember).toHaveBeenCalled();
      });
    });
  });

  describe('handleRoomsDuringMove — revocation orchestration', () => {
    beforeEach(() => {
      spaceLookupService.getAllDescendantSpaceIDs.mockResolvedValue([
        'child-1',
      ]);
      // Mock room collection returning some rooms
      const qb = mockQueryBuilder();
      qb.getRawMany
        .mockResolvedValueOnce([{ id: 'room-1' }]) // callout rooms
        .mockResolvedValueOnce([{ id: 'room-2' }]) // post rooms
        .mockResolvedValueOnce([{ id: 'room-3' }]); // updates rooms
      entityManager.createQueryBuilder.mockReturnValue(qb as any);

      // Mock communication lookup (no updates rooms to recreate for simplicity)
      communicationAdapter.batchRemoveMember.mockResolvedValue(true);
      communicationAdapter.batchRemoveSpaceMember.mockResolvedValue(true);
    });

    it('should skip revocation when removedActorIds is empty', async () => {
      await service.handleRoomsDuringMove('space-1', []);

      expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
      expect(
        communicationAdapter.batchRemoveSpaceMember
      ).not.toHaveBeenCalled();
    });

    it('should revoke for all actors when removedActorIds is provided', async () => {
      await service.handleRoomsDuringMove('space-1', ['actor-1', 'actor-2']);

      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledTimes(2);
      expect(communicationAdapter.batchRemoveSpaceMember).toHaveBeenCalledTimes(
        2
      );
    });

    it('should never throw — errors are caught and logged', async () => {
      spaceLookupService.getAllDescendantSpaceIDs.mockRejectedValue(
        new Error('DB down')
      );

      await expect(
        service.handleRoomsDuringMove('space-1', ['actor-1'])
      ).resolves.toBeUndefined();
    });
  });

  // ── T011: Comment preservation tests ───────────────────────────────────

  describe('handleRoomsDuringMove — comment preservation (US1)', () => {
    beforeEach(() => {
      spaceLookupService.getAllDescendantSpaceIDs.mockResolvedValue([]);
      const qb = mockQueryBuilder();
      qb.getRawMany
        .mockResolvedValueOnce([{ id: 'callout-room-1' }])
        .mockResolvedValueOnce([{ id: 'post-room-1' }])
        .mockResolvedValueOnce([{ id: 'updates-room-1' }]);
      entityManager.createQueryBuilder.mockReturnValue(qb as any);
      communicationAdapter.batchRemoveMember.mockResolvedValue(true);
      communicationAdapter.batchRemoveSpaceMember.mockResolvedValue(true);
    });

    it('should NOT call deleteRoom for callout or post rooms', async () => {
      await service.handleRoomsDuringMove('space-1', ['actor-1']);

      // deleteRoom may be called for updates rooms (via recreateUpdatesRooms),
      // but never for callout/post rooms directly from the orchestrator
      for (const call of roomService.deleteRoom.mock.calls) {
        const arg = call[0] as { roomID: string };
        expect(arg.roomID).not.toBe('callout-room-1');
        expect(arg.roomID).not.toBe('post-room-1');
      }
    });

    it('should succeed with zero removedActorIds (rooms preserved, no revocation)', async () => {
      await service.handleRoomsDuringMove('space-1', []);

      expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
      // Room entities are untouched
    });
  });

  // ── T014: Updates room recreation tests ────────────────────────────────

  describe('recreateUpdatesRooms', () => {
    const mockNewRoom = {
      id: 'new-room-1',
      displayName: 'updates-TestSpace',
      type: RoomType.UPDATES,
    } as IRoom;

    const mockCommunication = {
      id: 'comm-1',
      updates: { id: 'old-room-1' },
      spaceID: 'space-1',
      displayName: 'TestSpace',
    } as ICommunication;

    beforeEach(() => {
      roomService.deleteRoom.mockResolvedValue({ id: 'old-room-1' } as IRoom);
      roomService.createRoom.mockResolvedValue(mockNewRoom);
      communicationService.getCommunicationOrFail.mockResolvedValue(
        mockCommunication
      );
      communicationService.save.mockResolvedValue(mockCommunication);
    });

    it('should delete old room and create new UPDATES room for each communication', async () => {
      const communications = [
        {
          communicationId: 'comm-1',
          updatesRoomId: 'old-room-1',
          spaceId: 'space-1',
          displayName: 'TestSpace',
        },
      ];

      await service.recreateUpdatesRooms(communications);

      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'old-room-1',
      });
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'updates-TestSpace',
        type: RoomType.UPDATES,
      });
    });

    it('should update Communication entity with new room reference', async () => {
      const communications = [
        {
          communicationId: 'comm-1',
          updatesRoomId: 'old-room-1',
          spaceId: 'space-1',
          displayName: 'TestSpace',
        },
      ];

      await service.recreateUpdatesRooms(communications);

      expect(communicationService.getCommunicationOrFail).toHaveBeenCalledWith(
        'comm-1'
      );
      expect(communicationService.save).toHaveBeenCalled();
      // The saved communication should have the new room
      const savedComm = communicationService.save.mock.calls[0][0];
      expect(savedComm.updates).toBe(mockNewRoom);
    });

    it('should call deleteRoom and createRoom once per communication', async () => {
      const communications = [
        {
          communicationId: 'comm-1',
          updatesRoomId: 'old-1',
          spaceId: 'space-1',
          displayName: 'Space1',
        },
        {
          communicationId: 'comm-2',
          updatesRoomId: 'old-2',
          spaceId: 'space-2',
          displayName: 'Space2',
        },
      ];

      await service.recreateUpdatesRooms(communications);

      expect(roomService.deleteRoom).toHaveBeenCalledTimes(2);
      expect(roomService.createRoom).toHaveBeenCalledTimes(2);
    });

    it('should continue with remaining spaces when one fails', async () => {
      roomService.deleteRoom
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce({ id: 'old-2' } as IRoom);

      const communications = [
        {
          communicationId: 'comm-1',
          updatesRoomId: 'old-1',
          spaceId: 'space-1',
          displayName: 'Space1',
        },
        {
          communicationId: 'comm-2',
          updatesRoomId: 'old-2',
          spaceId: 'space-2',
          displayName: 'Space2',
        },
      ];

      await service.recreateUpdatesRooms(communications);

      // First failed, second succeeded
      expect(roomService.deleteRoom).toHaveBeenCalledTimes(2);
      // createRoom only called for the second (first failed at delete)
      expect(roomService.createRoom).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op for empty communications list', async () => {
      await service.recreateUpdatesRooms([]);

      expect(roomService.deleteRoom).not.toHaveBeenCalled();
      expect(roomService.createRoom).not.toHaveBeenCalled();
    });
  });

  // ── collectAllRoomIdsInSubtree ─────────────────────────────────────────

  describe('collectAllRoomIdsInSubtree', () => {
    it('should return empty array for empty spaceIds', async () => {
      const result = await service.collectAllRoomIdsInSubtree([]);

      expect(result).toEqual([]);
      expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should deduplicate room IDs across queries', async () => {
      const qb = mockQueryBuilder();
      qb.getRawMany
        .mockResolvedValueOnce([{ id: 'room-1' }, { id: 'room-2' }])
        .mockResolvedValueOnce([{ id: 'room-2' }, { id: 'room-3' }])
        .mockResolvedValueOnce([{ id: 'room-3' }, { id: 'room-4' }]);
      entityManager.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.collectAllRoomIdsInSubtree(['space-1']);

      expect(result).toHaveLength(4);
      expect(new Set(result).size).toBe(4);
    });
  });

  // ── getCommunicationsWithUpdatesRooms ──────────────────────────────────

  describe('getCommunicationsWithUpdatesRooms', () => {
    it('should return empty array for empty spaceIds', async () => {
      const result = await service.getCommunicationsWithUpdatesRooms([]);

      expect(result).toEqual([]);
    });

    it('should query communications by spaceID', async () => {
      const qb = mockQueryBuilder();
      qb.getRawMany.mockResolvedValue([
        {
          communicationId: 'comm-1',
          updatesRoomId: 'room-1',
          spaceId: 'space-1',
          displayName: 'Test',
        },
      ]);
      entityManager.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getCommunicationsWithUpdatesRooms([
        'space-1',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].communicationId).toBe('comm-1');
    });
  });
});
