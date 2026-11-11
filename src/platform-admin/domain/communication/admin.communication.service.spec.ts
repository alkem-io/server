import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { AdminCommunicationService } from './admin.communication.service';

describe('AdminCommunicationService', () => {
  let service: AdminCommunicationService;
  let communicationAdapter: {
    getRoomMembers: Mock;
    listRooms: Mock;
    getRoom: Mock;
    deleteRoom: Mock;
    updateRoom: Mock;
  };
  let communicationService: {
    getUpdates: Mock;
    getCommunicationIDsUsed: Mock;
    getCommunicationOrFail: Mock;
    getRoomIds: Mock;
    addContributorToCommunications: Mock;
  };
  let communityService: {
    getCommunityOrFail: Mock;
    getCommunication: Mock;
  };
  let roleSetService: { getUsersWithRole: Mock };
  let conversationService: {
    findConversationsWithoutRooms: Mock;
    ensureRoomExists: Mock;
    findConversationByRoomId: Mock;
    getConversationMembers: Mock;
  };
  let module: TestingModule;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [
        AdminCommunicationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminCommunicationService);
    communicationAdapter = module.get(
      CommunicationAdapter
    ) as unknown as typeof communicationAdapter;
    communicationService = module.get(
      CommunicationService
    ) as unknown as typeof communicationService;
    communityService = module.get(
      CommunityService
    ) as unknown as typeof communityService;
    roleSetService = module.get(
      RoleSetService
    ) as unknown as typeof roleSetService;
    conversationService = module.get(
      ConversationService
    ) as unknown as typeof conversationService;
  });

  describe('removeOrphanedRoom', () => {
    it('should throw ValidationException when room is in use', async () => {
      // Setup: one communication with room 'room-1' being used
      vi.mocked(communicationService.getCommunicationIDsUsed).mockResolvedValue(
        ['comm-1']
      );
      vi.mocked(communicationService.getCommunicationOrFail).mockResolvedValue({
        id: 'comm-1',
      } as any);
      vi.mocked(communicationService.getRoomIds).mockReturnValue(['room-1']);

      await expect(
        service.removeOrphanedRoom({ roomID: 'room-1' })
      ).rejects.toThrow(ValidationException);
    });

    it('should delete the room when it is not in use', async () => {
      vi.mocked(communicationService.getCommunicationIDsUsed).mockResolvedValue(
        ['comm-1']
      );
      vi.mocked(communicationService.getCommunicationOrFail).mockResolvedValue({
        id: 'comm-1',
      } as any);
      vi.mocked(communicationService.getRoomIds).mockReturnValue(['room-used']);
      vi.mocked(communicationAdapter.deleteRoom).mockResolvedValue(true);

      const result = await service.removeOrphanedRoom({
        roomID: 'room-orphaned',
      });

      expect(communicationAdapter.deleteRoom).toHaveBeenCalledWith(
        'room-orphaned'
      );
      expect(result).toBe(true);
    });
  });

  describe('orphanedUsage', () => {
    it('should return rooms from Matrix that are not used in any communication', async () => {
      vi.mocked(communicationService.getCommunicationIDsUsed).mockResolvedValue(
        ['comm-1']
      );
      vi.mocked(communicationService.getCommunicationOrFail).mockResolvedValue({
        id: 'comm-1',
      } as any);
      vi.mocked(communicationService.getRoomIds).mockReturnValue([
        'room-used-1',
      ]);
      vi.mocked(communicationAdapter.listRooms).mockResolvedValue([
        'room-used-1',
        'room-orphan-1',
      ]);
      vi.mocked(communicationAdapter.getRoom).mockResolvedValue({
        id: 'room-orphan-1',
        displayName: 'Orphan Room',
        members: ['m1'],
      } as any);

      const result = await service.orphanedUsage();

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].id).toBe('room-orphan-1');
    });

    it('should return empty rooms when all Matrix rooms are used', async () => {
      vi.mocked(communicationService.getCommunicationIDsUsed).mockResolvedValue(
        ['comm-1']
      );
      vi.mocked(communicationService.getCommunicationOrFail).mockResolvedValue({
        id: 'comm-1',
      } as any);
      vi.mocked(communicationService.getRoomIds).mockReturnValue([
        'room-1',
        'room-2',
      ]);
      vi.mocked(communicationAdapter.listRooms).mockResolvedValue([
        'room-1',
        'room-2',
      ]);

      const result = await service.orphanedUsage();

      expect(result.rooms).toHaveLength(0);
    });
  });

  describe('regenerateMissingRooms', () => {
    let roomService: { ensureExternalRoom: Mock };
    let entityManager: { find: Mock; createQueryBuilder: Mock };
    let getRawOne: Mock;

    beforeEach(() => {
      roomService = module.get(RoomService) as unknown as typeof roomService;
      roomService.ensureExternalRoom.mockResolvedValue(true);
      entityManager = module.get(
        EntityManager
      ) as unknown as typeof entityManager;
      getRawOne = vi.fn();
      const queryBuilder: Record<string, Mock> = {};
      for (const method of ['select', 'from', 'innerJoin', 'where']) {
        queryBuilder[method] = vi.fn().mockReturnValue(queryBuilder);
      }
      queryBuilder.getRawOne = getRawOne;
      entityManager.createQueryBuilder.mockReturnValue(queryBuilder);
    });

    const givenRooms = (...types: RoomType[]) => {
      const rooms = types.map((type, index) => ({
        id: `room-${index + 1}`,
        type,
        displayName: 'name',
      }));
      entityManager.find.mockResolvedValue(rooms);
      return rooms;
    };
    const transportError = () =>
      CommunicationAdapterException.fromTransportError(
        'getRoom',
        new Error('RPC timeout')
      );

    describe('discovering missing rooms', () => {
      it('only examines rooms the adapter does not list, and counts the rest as existing', async () => {
        const [, missing] = givenRooms(RoomType.UPDATES, RoomType.UPDATES);
        communicationAdapter.listRooms.mockResolvedValue(['room-1']);

        const result = await service.regenerateMissingRooms({});

        expect(roomService.ensureExternalRoom).toHaveBeenCalledTimes(1);
        expect(roomService.ensureExternalRoom).toHaveBeenCalledWith(
          missing,
          {}
        );
        expect(result).toMatchObject({
          regenerated: 1,
          alreadyExisted: 1,
          failed: 0,
          aborted: false,
          rooms: [
            {
              roomID: 'room-2',
              type: RoomType.UPDATES,
              outcome: 'regenerated',
            },
          ],
        });
      });

      it('leaves out rooms created within the in-flight grace period', async () => {
        givenRooms();
        communicationAdapter.listRooms.mockResolvedValue([]);
        const before = Date.now();

        await service.regenerateMissingRooms({});

        const createdBefore: Date =
          entityManager.find.mock.calls[0][1].where.createdDate.value;
        expect(createdBefore.getTime()).toBeLessThanOrEqual(
          before - 5 * 60 * 1000 + 1000
        );
      });

      it('reports an unlisted room that turns out to exist as already existed', async () => {
        givenRooms(RoomType.UPDATES);
        communicationAdapter.listRooms.mockResolvedValue([]);
        roomService.ensureExternalRoom.mockResolvedValue(false);

        const result = await service.regenerateMissingRooms({});

        expect(result).toMatchObject({
          regenerated: 0,
          alreadyExisted: 1,
          rooms: [{ roomID: 'room-1', outcome: 'already-existed' }],
        });
      });
    });

    describe('with explicit roomIDs', () => {
      it('examines exactly the requested rooms without listing all rooms', async () => {
        givenRooms(RoomType.UPDATES);

        const result = await service.regenerateMissingRooms({
          roomIDs: ['room-1', 'room-1'],
        });

        expect(communicationAdapter.listRooms).not.toHaveBeenCalled();
        expect(roomService.ensureExternalRoom).toHaveBeenCalledTimes(1);
        expect(result.regenerated).toBe(1);
      });

      it('reports an unknown room ID as failed', async () => {
        givenRooms();

        const result = await service.regenerateMissingRooms({
          roomIDs: ['room-x'],
        });

        expect(result).toMatchObject({
          failed: 1,
          rooms: [
            { roomID: 'room-x', outcome: 'failed', error: 'Room not found' },
          ],
        });
      });
    });

    describe('failures', () => {
      it('keeps going after a room fails for a reason the adapter reported', async () => {
        givenRooms(RoomType.UPDATES, RoomType.UPDATES);
        communicationAdapter.listRooms.mockResolvedValue([]);
        roomService.ensureExternalRoom
          .mockRejectedValueOnce(
            CommunicationAdapterException.fromAdapterError('createRoom', {
              code: 'MATRIX_ERROR',
              message: 'synapse said no',
            })
          )
          .mockResolvedValueOnce(true);

        const result = await service.regenerateMissingRooms({});

        expect(result).toMatchObject({
          regenerated: 1,
          failed: 1,
          aborted: false,
          rooms: [
            { roomID: 'room-1', outcome: 'failed' },
            { roomID: 'room-2', outcome: 'regenerated' },
          ],
        });
      });

      it('aborts the pass when the adapter cannot be reached', async () => {
        givenRooms(RoomType.UPDATES, RoomType.UPDATES);
        communicationAdapter.listRooms.mockResolvedValue([]);
        roomService.ensureExternalRoom.mockRejectedValue(transportError());

        const result = await service.regenerateMissingRooms({});

        expect(roomService.ensureExternalRoom).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ failed: 1, aborted: true });
        expect(result.rooms).toHaveLength(1);
      });
    });

    describe('creation context per owner', () => {
      const regenerateOne = async (type: RoomType) => {
        const [room] = givenRooms(type);
        const result = await service.regenerateMissingRooms({
          roomIDs: [room.id],
        });
        return { room, result };
      };

      it.each([
        RoomType.CALLOUT,
        RoomType.POST,
      ])('passes the owning space for a %s room', async type => {
        getRawOne.mockResolvedValue({ spaceId: 'space-1' });

        const { room } = await regenerateOne(type);

        expect(roomService.ensureExternalRoom).toHaveBeenCalledWith(room, {
          parentContextId: 'space-1',
        });
      });

      it('re-creates forum discussion rooms as public', async () => {
        const { room } = await regenerateOne(RoomType.DISCUSSION_FORUM);

        expect(roomService.ensureExternalRoom).toHaveBeenCalledWith(room, {
          joinRule: 'public',
          isPublic: true,
        });
      });

      it('re-creates a direct conversation room with both members', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-1',
        });
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'actor-1' },
          { actorID: 'actor-2' },
        ]);

        const { room } = await regenerateOne(RoomType.CONVERSATION_DIRECT);

        expect(roomService.ensureExternalRoom).toHaveBeenCalledWith(room, {
          senderActorID: 'actor-1',
          receiverActorID: 'actor-2',
        });
      });

      it('re-creates a group conversation room with all its members', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-1',
        });
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'actor-1' },
          { actorID: 'actor-2' },
          { actorID: 'actor-3' },
        ]);

        const { room } = await regenerateOne(RoomType.CONVERSATION_GROUP);

        expect(roomService.ensureExternalRoom).toHaveBeenCalledWith(room, {
          memberActorIDs: ['actor-1', 'actor-2', 'actor-3'],
        });
      });

      it('fails a direct conversation room that does not have exactly 2 members, without sending a create', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-1',
        });
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'actor-1' },
        ]);

        const { result } = await regenerateOne(RoomType.CONVERSATION_DIRECT);

        expect(roomService.ensureExternalRoom).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          failed: 1,
          rooms: [{ outcome: 'failed' }],
        });
      });

      it.each([
        RoomType.CONVERSATION_GROUP,
        RoomType.CONVERSATION_DIRECT,
      ])('fails a %s room that no conversation uses, without sending a create', async type => {
        conversationService.findConversationByRoomId.mockResolvedValue(null);

        const { result } = await regenerateOne(type);

        expect(roomService.ensureExternalRoom).not.toHaveBeenCalled();
        expect(result.failed).toBe(1);
      });

      it('refuses legacy conversation rooms rather than guess their shape', async () => {
        const { result } = await regenerateOne(RoomType.CONVERSATION);

        expect(roomService.ensureExternalRoom).not.toHaveBeenCalled();
        expect(result.failed).toBe(1);
      });
    });
  });

  describe('migrateConversationRooms', () => {
    it('should increment migrated count for each successful room creation', async () => {
      vi.mocked(
        conversationService.findConversationsWithoutRooms
      ).mockResolvedValue([{ id: 'conv-1' } as any, { id: 'conv-2' } as any]);
      vi.mocked(conversationService.ensureRoomExists)
        .mockResolvedValueOnce({ id: 'room-1' } as any)
        .mockResolvedValueOnce({ id: 'room-2' } as any);

      const result = await service.migrateConversationRooms();

      expect(result.migrated).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should increment failed count when ensureRoomExists returns undefined', async () => {
      vi.mocked(
        conversationService.findConversationsWithoutRooms
      ).mockResolvedValue([{ id: 'conv-1' } as any]);
      vi.mocked(conversationService.ensureRoomExists).mockResolvedValue(
        undefined as any
      );

      const result = await service.migrateConversationRooms();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('conv-1');
    });

    it('should handle errors during room creation and continue processing', async () => {
      vi.mocked(
        conversationService.findConversationsWithoutRooms
      ).mockResolvedValue([{ id: 'conv-1' } as any, { id: 'conv-2' } as any]);
      vi.mocked(conversationService.ensureRoomExists)
        .mockRejectedValueOnce(new Error('room creation failed'))
        .mockResolvedValueOnce({ id: 'room-2' } as any);

      const result = await service.migrateConversationRooms();

      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('room creation failed');
    });

    it('should return zero counts when no conversations need migration', async () => {
      vi.mocked(
        conversationService.findConversationsWithoutRooms
      ).mockResolvedValue([]);

      const result = await service.migrateConversationRooms();

      expect(result.migrated).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('communicationMembership', () => {
    it('should detect missing members who are in community but not in room', async () => {
      const community = { id: 'comm-1', roleSet: { id: 'rs-1' } };
      vi.mocked(communityService.getCommunityOrFail).mockResolvedValue(
        community as any
      );
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any);
      const communication = {
        id: 'commn-1',
        displayName: 'Comm',
        updates: { id: 'room-1' },
      };
      vi.mocked(communityService.getCommunication).mockResolvedValue(
        communication as any
      );
      const updatesRoom = { id: 'room-1', displayName: 'Updates' };
      vi.mocked(communicationService.getUpdates).mockReturnValue(
        updatesRoom as any
      );
      // Only user-1 is in the room
      vi.mocked(communicationAdapter.getRoomMembers).mockResolvedValue([
        'user-1',
      ]);

      const result = await service.communicationMembership({
        communityID: 'comm-1',
      });

      expect(result.rooms[0].missingMembers).toContain('user-2');
    });

    it('should detect extra members who are in room but not in community', async () => {
      const community = { id: 'comm-1', roleSet: { id: 'rs-1' } };
      vi.mocked(communityService.getCommunityOrFail).mockResolvedValue(
        community as any
      );
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([
        { id: 'user-1' },
      ] as any);
      const communication = {
        id: 'commn-1',
        displayName: 'Comm',
      };
      vi.mocked(communityService.getCommunication).mockResolvedValue(
        communication as any
      );
      const updatesRoom = { id: 'room-1', displayName: 'Updates' };
      vi.mocked(communicationService.getUpdates).mockReturnValue(
        updatesRoom as any
      );
      // Room has user-1 and an extra user-999
      vi.mocked(communicationAdapter.getRoomMembers).mockResolvedValue([
        'user-1',
        'user-999',
      ]);

      const result = await service.communicationMembership({
        communityID: 'comm-1',
      });

      expect(result.rooms[0].extraMembers).toContain('user-999');
    });

    it('should report no missing members when all community members are in the room', async () => {
      const community = { id: 'comm-1', roleSet: { id: 'rs-1' } };
      vi.mocked(communityService.getCommunityOrFail).mockResolvedValue(
        community as any
      );
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any);
      const communication = { id: 'commn-1', displayName: 'Comm' };
      vi.mocked(communityService.getCommunication).mockResolvedValue(
        communication as any
      );
      const updatesRoom = { id: 'room-1', displayName: 'Updates' };
      vi.mocked(communicationService.getUpdates).mockReturnValue(
        updatesRoom as any
      );
      vi.mocked(communicationAdapter.getRoomMembers).mockResolvedValue([
        'user-1',
        'user-2',
      ]);

      const result = await service.communicationMembership({
        communityID: 'comm-1',
      });

      // All community members are in the room, so no missing members
      expect(result.rooms[0].missingMembers).toHaveLength(0);
    });
  });
});
