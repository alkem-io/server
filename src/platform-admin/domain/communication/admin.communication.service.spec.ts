import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { CommunityService } from '@domain/community/community/community.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
