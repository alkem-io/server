import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mocked } from 'vitest';
import { IMessage } from '../message/message.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { Room } from './room.entity';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let roomLookupService: Mocked<RoomLookupService>;
  let _actorLookupService: Mocked<ActorLookupService>;
  let roomRepo: Mocked<Repository<Room>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        repositoryProviderMockFactory(Room),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomService);
    communicationAdapter = module.get(CommunicationAdapter);
    roomLookupService = module.get(RoomLookupService);
    _actorLookupService = module.get(ActorLookupService);
    roomRepo = module.get(getRepositoryToken(Room));
  });

  describe('createRoom', () => {
    it('should create room with authorization, save it, and create external room', async () => {
      const savedRoom = {
        id: 'room-1',
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
        messagesCount: 0,
        vcInteractionsByThread: {},
        authorization: expect.any(Object),
      };
      roomRepo.save.mockResolvedValue(savedRoom as any);
      communicationAdapter.createRoom.mockResolvedValue(undefined as any);

      const result = await service.createRoom({
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
      });

      expect(result).toBe(savedRoom);
      expect(roomRepo.save).toHaveBeenCalled();
      expect(communicationAdapter.createRoom).toHaveBeenCalledWith(
        'room-1',
        RoomType.CALLOUT,
        'Test Room',
        undefined
      );
    });

    it('should pass senderActorId as initial member for non-direct rooms', async () => {
      const savedRoom = {
        id: 'room-1',
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
      };
      roomRepo.save.mockResolvedValue(savedRoom as any);
      communicationAdapter.createRoom.mockResolvedValue(undefined as any);

      await service.createRoom({
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
        senderActorId: 'agent-1',
      });

      expect(communicationAdapter.createRoom).toHaveBeenCalledWith(
        'room-1',
        RoomType.CALLOUT,
        'Test Room',
        ['agent-1']
      );
    });

    it('should pass both sender and receiver as initial members for direct rooms', async () => {
      const savedRoom = {
        id: 'room-1',
        displayName: 'DM Room',
        type: RoomType.CONVERSATION_DIRECT,
      };
      roomRepo.save.mockResolvedValue(savedRoom as any);
      communicationAdapter.createRoom.mockResolvedValue(undefined as any);

      await service.createRoom({
        displayName: 'DM Room',
        type: RoomType.CONVERSATION_DIRECT,
        senderActorId: 'agent-1',
        receiverActorId: 'agent-2',
      });

      expect(communicationAdapter.createRoom).toHaveBeenCalledWith(
        'room-1',
        RoomType.CONVERSATION_DIRECT,
        'DM Room',
        ['agent-1', 'agent-2']
      );
    });

    it('should throw Error when direct room is missing senderActorId', async () => {
      roomRepo.save.mockResolvedValue({
        id: 'room-1',
        displayName: 'DM Room',
        type: RoomType.CONVERSATION_DIRECT,
      } as any);

      await expect(
        service.createRoom({
          displayName: 'DM Room',
          type: RoomType.CONVERSATION_DIRECT,
          receiverActorId: 'agent-2',
        })
      ).rejects.toThrow(Error);
    });

    it('should throw Error when direct room is missing receiverActorId', async () => {
      roomRepo.save.mockResolvedValue({
        id: 'room-1',
        displayName: 'DM Room',
        type: RoomType.CONVERSATION_DIRECT,
      } as any);

      await expect(
        service.createRoom({
          displayName: 'DM Room',
          type: RoomType.CONVERSATION_DIRECT,
          senderActorId: 'agent-1',
        })
      ).rejects.toThrow(Error);
    });

    it('should log error but not throw when external room creation fails', async () => {
      roomRepo.save.mockResolvedValue({
        id: 'room-1',
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
      } as any);
      communicationAdapter.createRoom.mockRejectedValue(
        new Error('Matrix error')
      );

      const result = await service.createRoom({
        displayName: 'Test Room',
        type: RoomType.CALLOUT,
      });

      // Should still return the saved room despite Matrix failure
      expect(result.id).toBe('room-1');
    });
  });

  describe('deleteRoom', () => {
    it('should throw ValidationException when roomID is not provided', async () => {
      await expect(service.deleteRoom({ roomID: '' })).rejects.toThrow(
        ValidationException
      );
    });

    it('should remove room from database and delete from Matrix', async () => {
      const mockRoom = { id: 'room-1' } as Room;
      roomLookupService.getRoomOrFail.mockResolvedValue(mockRoom);
      roomRepo.remove.mockResolvedValue({ ...mockRoom, id: '' } as Room);
      communicationAdapter.deleteRoom.mockResolvedValue(undefined as any);

      const result = await service.deleteRoom({ roomID: 'room-1' });

      expect(roomRepo.remove).toHaveBeenCalledWith(mockRoom);
      expect(communicationAdapter.deleteRoom).toHaveBeenCalledWith('room-1');
      expect(result.id).toBe('room-1');
    });
  });

  describe('updateRoomDisplayName', () => {
    it('should update display name in both database and Matrix', async () => {
      const mockRoom = {
        id: 'room-1',
        displayName: 'Old Name',
      } as unknown as IRoom;

      roomRepo.save.mockResolvedValue({
        ...mockRoom,
        displayName: 'New Name',
      } as Room);

      const _result = await service.updateRoomDisplayName(mockRoom, 'New Name');

      expect(mockRoom.displayName).toBe('New Name');
      expect(communicationAdapter.updateRoom).toHaveBeenCalledWith(
        'room-1',
        'New Name'
      );
      expect(roomRepo.save).toHaveBeenCalled();
    });

    it('should skip update when display name has not changed', async () => {
      const mockRoom = {
        id: 'room-1',
        displayName: 'Same Name',
      } as unknown as IRoom;

      const result = await service.updateRoomDisplayName(mockRoom, 'Same Name');

      expect(result).toBe(mockRoom);
      expect(communicationAdapter.updateRoom).not.toHaveBeenCalled();
      expect(roomRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeRoomMessage', () => {
    it('should delete message using sender impersonation workaround', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getMessageSenderActor.mockResolvedValue(
        'sender-actor-1'
      );
      communicationAdapter.deleteMessage.mockResolvedValue(undefined as any);

      const result = await service.removeRoomMessage(
        mockRoom,
        { roomID: 'room-1', messageID: 'msg-1' },
        'admin-agent-1'
      );

      expect(result).toBe('msg-1');
      expect(communicationAdapter.getMessageSenderActor).toHaveBeenCalledWith({
        alkemioRoomId: 'room-1',
        messageId: 'msg-1',
      });
      expect(communicationAdapter.deleteMessage).toHaveBeenCalledWith({
        actorId: 'sender-actor-1',
        messageId: 'msg-1',
        roomID: 'room-1',
      });
    });

    it('should throw ValidationException when sender cannot be identified', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getMessageSenderActor.mockResolvedValue('' as any);

      await expect(
        service.removeRoomMessage(
          mockRoom,
          { roomID: 'room-1', messageID: 'msg-1' },
          'admin-agent-1'
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('removeReactionToMessage', () => {
    it('should remove reaction using sender impersonation workaround', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getReactionSenderActor.mockResolvedValue(
        'reactor-actor-1'
      );
      communicationAdapter.removeReaction.mockResolvedValue(undefined as any);

      const result = await service.removeReactionToMessage(
        mockRoom,
        { roomID: 'room-1', reactionID: 'reaction-1' },
        'admin-agent-1'
      );

      expect(result).toBe(true);
      expect(communicationAdapter.removeReaction).toHaveBeenCalledWith({
        alkemioRoomId: 'room-1',
        actorId: 'reactor-actor-1',
        reactionId: 'reaction-1',
      });
    });

    it('should throw ValidationException when reaction sender cannot be identified', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getReactionSenderActor.mockResolvedValue('' as any);

      await expect(
        service.removeReactionToMessage(
          mockRoom,
          { roomID: 'room-1', reactionID: 'reaction-1' },
          'admin-agent-1'
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('getUserIdForMessage', () => {
    it('should resolve user ID from message sender actor', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getMessageSenderActor.mockResolvedValue(
        'sender-actor-1'
      );

      const result = await service.getUserIdForMessage(mockRoom, 'msg-1');

      expect(result).toBe('sender-actor-1');
    });

    it('should return empty string when sender actor is empty', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getMessageSenderActor.mockResolvedValue('');

      const result = await service.getUserIdForMessage(mockRoom, 'msg-1');

      expect(result).toBe('');
    });
  });

  describe('getUserIdForReaction', () => {
    it('should resolve user ID from reaction sender actor', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getReactionSenderActor.mockResolvedValue(
        'reactor-actor-1'
      );

      const result = await service.getUserIdForReaction(mockRoom, 'reaction-1');

      expect(result).toBe('reactor-actor-1');
    });
  });

  describe('getUnreadCounts', () => {
    const mockRoom = { id: 'room-1' } as unknown as IRoom;

    it('should return room-level unread count when threadIds is undefined', async () => {
      communicationAdapter.getUnreadCounts.mockResolvedValue({
        roomUnreadCount: 5,
        threadUnreadCounts: null,
      } as any);

      const result = await service.getUnreadCounts(mockRoom, 'agent-1');

      expect(result.roomUnreadCount).toBe(5);
      expect(result.threadUnreadCounts).toBeUndefined();
    });

    it('should return thread-level counts when threadIds is provided', async () => {
      communicationAdapter.getUnreadCounts.mockResolvedValue({
        roomUnreadCount: 5,
        threadUnreadCounts: {
          'thread-1': 3,
          'thread-2': 2,
        },
      } as any);

      const result = await service.getUnreadCounts(mockRoom, 'agent-1', [
        'thread-1',
        'thread-2',
      ]);

      expect(result.roomUnreadCount).toBe(5);
      expect(result.threadUnreadCounts).toHaveLength(2);
      expect(result.threadUnreadCounts).toContainEqual({
        threadId: 'thread-1',
        count: 3,
      });
      expect(result.threadUnreadCounts).toContainEqual({
        threadId: 'thread-2',
        count: 2,
      });
    });

    it('should return empty array for threadUnreadCounts when threadIds provided but no results', async () => {
      communicationAdapter.getUnreadCounts.mockResolvedValue({
        roomUnreadCount: 0,
        threadUnreadCounts: null,
      } as any);

      const result = await service.getUnreadCounts(mockRoom, 'agent-1', []);

      expect(result.roomUnreadCount).toBe(0);
      expect(result.threadUnreadCounts).toEqual([]);
    });

    it('should return empty array for threadUnreadCounts when threadIds is empty array', async () => {
      communicationAdapter.getUnreadCounts.mockResolvedValue({
        roomUnreadCount: 2,
        threadUnreadCounts: undefined,
      } as any);

      const result = await service.getUnreadCounts(mockRoom, 'agent-1', []);

      expect(result.threadUnreadCounts).toEqual([]);
    });
  });

  describe('markMessageAsRead', () => {
    it('should delegate to communication adapter and return true', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.markMessageRead.mockResolvedValue(undefined as any);

      const result = await service.markMessageAsRead(mockRoom, 'agent-1', {
        roomID: 'room-1',
        messageID: 'msg-1',
        threadID: 'thread-1',
      });

      expect(result).toBe(true);
      expect(communicationAdapter.markMessageRead).toHaveBeenCalledWith(
        'agent-1',
        'room-1',
        'msg-1',
        'thread-1'
      );
    });
  });

  describe('getLastMessage', () => {
    it('should return last message from communication adapter', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      const mockMessage: IMessage = {
        id: 'msg-last',
        message: 'Latest',
        sender: 'agent-1',
        timestamp: Date.now(),
        reactions: [],
      };
      communicationAdapter.getLastMessage.mockResolvedValue(mockMessage);

      const result = await service.getLastMessage(mockRoom);

      expect(result).toBe(mockMessage);
      expect(communicationAdapter.getLastMessage).toHaveBeenCalledWith(
        'room-1'
      );
    });

    it('should return null when no messages exist', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      communicationAdapter.getLastMessage.mockResolvedValue(null);

      const result = await service.getLastMessage(mockRoom);

      expect(result).toBeNull();
    });
  });
});
