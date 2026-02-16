import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { Room } from '../room/room.entity';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from './room.lookup.service';

describe('RoomLookupService', () => {
  let service: RoomLookupService;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let roomRepo: Mocked<Repository<Room>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomLookupService,
        repositoryProviderMockFactory(Room),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomLookupService);
    communicationAdapter = module.get(CommunicationAdapter);
    roomRepo = module.get(getRepositoryToken(Room));
  });

  describe('getRoomOrFail', () => {
    it('should return room when found', async () => {
      const mockRoom = { id: 'room-1', displayName: 'Test Room' } as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);

      const result = await service.getRoomOrFail('room-1');

      expect(result).toBe(mockRoom);
      expect(roomRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
    });

    it('should throw EntityNotFoundException when room not found', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.getRoomOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass FindOneOptions through to repository', async () => {
      const options = { relations: { callout: true } };
      roomRepo.findOne.mockResolvedValue({ id: 'room-1' } as Room);

      await service.getRoomOrFail('room-1', options);

      expect(roomRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        relations: { callout: true },
      });
    });
  });

  describe('getMessageInRoom', () => {
    it('should return message and room when both found', async () => {
      const mockRoom = { id: 'room-1' } as Room;
      const mockMessage: IMessage = {
        id: 'msg-1',
        message: 'Hello',
        sender: 'agent-1',
        timestamp: Date.now(),
        reactions: [],
      };

      roomRepo.findOne.mockResolvedValue(mockRoom);
      communicationAdapter.getMessage.mockResolvedValue(mockMessage);

      const result = await service.getMessageInRoom('room-1', 'msg-1');

      expect(result.room).toBe(mockRoom);
      expect(result.message).toBe(mockMessage);
      expect(communicationAdapter.getMessage).toHaveBeenCalledWith({
        alkemioRoomId: 'room-1',
        messageId: 'msg-1',
      });
    });

    it('should throw EntityNotFoundException when message not found in room', async () => {
      const mockRoom = { id: 'room-1' } as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);
      communicationAdapter.getMessage.mockResolvedValue(
        null as unknown as IMessage
      );

      await expect(
        service.getMessageInRoom('room-1', 'missing-msg')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when room not found', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMessageInRoom('missing-room', 'msg-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getMessagesInThread', () => {
    it('should delegate to communication adapter getThreadMessages', async () => {
      const mockRoom = { id: 'room-1' } as unknown as IRoom;
      const mockMessages: IMessage[] = [
        {
          id: 'msg-1',
          message: 'Reply 1',
          sender: 'agent-1',
          timestamp: 1000,
          reactions: [],
        },
      ];

      communicationAdapter.getThreadMessages.mockResolvedValue(mockMessages);

      const result = await service.getMessagesInThread(mockRoom, 'thread-1');

      expect(result).toBe(mockMessages);
      expect(communicationAdapter.getThreadMessages).toHaveBeenCalledWith(
        'room-1',
        'thread-1'
      );
    });
  });

  describe('addVcInteractionToRoom', () => {
    it('should add VC interaction to room vcInteractionsByThread map', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {},
      } as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);
      roomRepo.save.mockResolvedValue(mockRoom);

      const result = await service.addVcInteractionToRoom({
        roomID: 'room-1',
        threadID: 'thread-1',
        virtualContributorActorID: 'vc-agent-1',
      });

      expect(result.threadID).toBe('thread-1');
      expect(result.virtualContributorID).toBe('vc-agent-1');
      expect(mockRoom.vcInteractionsByThread['thread-1']).toEqual({
        virtualContributorActorID: 'vc-agent-1',
      });
      expect(roomRepo.save).toHaveBeenCalledWith(mockRoom);
    });

    it('should initialize vcInteractionsByThread when null', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: null,
      } as unknown as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);
      roomRepo.save.mockResolvedValue(mockRoom);

      await service.addVcInteractionToRoom({
        roomID: 'room-1',
        threadID: 'thread-1',
        virtualContributorActorID: 'vc-agent-1',
      });

      expect(mockRoom.vcInteractionsByThread).toBeDefined();
      expect(mockRoom.vcInteractionsByThread['thread-1']).toEqual({
        virtualContributorActorID: 'vc-agent-1',
      });
    });

    it('should overwrite existing interaction for the same thread', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'old-vc' },
        },
      } as unknown as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);
      roomRepo.save.mockResolvedValue(mockRoom);

      await service.addVcInteractionToRoom({
        roomID: 'room-1',
        threadID: 'thread-1',
        virtualContributorActorID: 'new-vc',
      });

      expect(
        mockRoom.vcInteractionsByThread['thread-1'].virtualContributorActorID
      ).toBe('new-vc');
    });
  });

  describe('getVcInteractions', () => {
    it('should return mapped VC interactions from room JSON storage', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'vc-agent-1' },
          'thread-2': { virtualContributorActorID: 'vc-agent-2' },
        },
      } as unknown as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractions('room-1');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        threadID: 'thread-1',
        virtualContributorID: 'vc-agent-1',
      });
      expect(result).toContainEqual({
        threadID: 'thread-2',
        virtualContributorID: 'vc-agent-2',
      });
    });

    it('should return empty array when vcInteractionsByThread is empty', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {},
      } as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractions('room-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when vcInteractionsByThread is falsy', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: undefined,
      } as unknown as Room;
      roomRepo.findOne.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractions('room-1');

      expect(result).toEqual([]);
    });
  });

  describe('incrementMessagesCount', () => {
    it('should call repository increment with correct parameters', async () => {
      roomRepo.increment.mockResolvedValue(undefined as any);

      await service.incrementMessagesCount('room-1');

      expect(roomRepo.increment).toHaveBeenCalledWith(
        { id: 'room-1' },
        'messagesCount',
        1
      );
    });
  });

  describe('decrementMessagesCount', () => {
    it('should execute update query with GREATEST to prevent negative count', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      roomRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.decrementMessagesCount('room-1');

      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        messagesCount: expect.any(Function),
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'room-1',
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});
