import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { IRoom } from '../room/room.interface';
import { RoomService } from '../room/room.service';
import { Communication } from './communication.entity';
import { ICommunication } from './communication.interface';
import { CommunicationService } from './communication.service';

describe('CommunicationService', () => {
  let service: CommunicationService;
  let roomService: Mocked<RoomService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let communicationRepo: Mocked<Repository<Communication>>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        MockWinstonProvider,
        repositoryProviderMockFactory(Communication),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunicationService>(CommunicationService);
    roomService = module.get(RoomService);
    communicationAdapter = module.get(CommunicationAdapter);
    communicationRepo = module.get(getRepositoryToken(Communication));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCommunication', () => {
    it('should create a communication with updates room', async () => {
      const mockUpdatesRoom = {
        id: 'room-1',
        displayName: 'TestSpace-Updates',
      } as IRoom;

      communicationRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 'comm-1',
      }));
      roomService.createRoom.mockResolvedValue(mockUpdatesRoom);

      const result = await service.createCommunication('TestSpace', 'space-1');

      expect(result.spaceID).toBe('space-1');
      expect(result.authorization).toBeDefined();
      expect(result.updates).toBe(mockUpdatesRoom);
      expect(communicationRepo.save).toHaveBeenCalled();
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'TestSpace-Updates',
        type: RoomType.UPDATES,
      });
    });
  });

  describe('save', () => {
    it('should save communication to repository', async () => {
      const mockComm = { id: 'comm-1' } as ICommunication;
      communicationRepo.save.mockResolvedValue(mockComm as Communication);

      const result = await service.save(mockComm);

      expect(result).toBe(mockComm);
      expect(communicationRepo.save).toHaveBeenCalledWith(mockComm);
    });
  });

  describe('getUpdates', () => {
    it('should return updates room when available', () => {
      const mockRoom = { id: 'room-1' } as IRoom;
      const mockComm = {
        id: 'comm-1',
        updates: mockRoom,
      } as ICommunication;

      const result = service.getUpdates(mockComm);

      expect(result).toBe(mockRoom);
    });

    it('should throw EntityNotInitializedException when updates is not loaded', () => {
      const mockComm = {
        id: 'comm-1',
        updates: undefined,
      } as unknown as ICommunication;

      expect(() => service.getUpdates(mockComm)).toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getCommunicationOrFail', () => {
    it('should return communication when found', async () => {
      const mockComm = { id: 'comm-1' } as Communication;
      communicationRepo.findOne.mockResolvedValue(mockComm);

      const result = await service.getCommunicationOrFail('comm-1');

      expect(result).toBe(mockComm);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      communicationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunicationOrFail('missing-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should pass options to findOne', async () => {
      const mockComm = { id: 'comm-1' } as Communication;
      const options = { relations: { updates: true } };
      communicationRepo.findOne.mockResolvedValue(mockComm);

      await service.getCommunicationOrFail('comm-1', options);

      expect(communicationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        ...options,
      });
    });
  });

  describe('removeCommunication', () => {
    it('should remove communication and its updates room', async () => {
      const mockComm = {
        id: 'comm-1',
        updates: { id: 'room-1' },
      } as Communication;
      communicationRepo.findOne.mockResolvedValue(mockComm);
      communicationRepo.remove.mockResolvedValue(mockComm);

      const result = await service.removeCommunication('comm-1');

      expect(result).toBe(true);
      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
      expect(communicationRepo.remove).toHaveBeenCalledWith(mockComm);
    });

    it('should throw when communication not found', async () => {
      communicationRepo.findOne.mockResolvedValue(null);

      await expect(service.removeCommunication('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw when updates room not loaded', async () => {
      const mockComm = {
        id: 'comm-1',
        updates: undefined,
      } as unknown as Communication;
      communicationRepo.findOne.mockResolvedValue(mockComm);

      await expect(service.removeCommunication('comm-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('addContributorToCommunications', () => {
    it('should add contributor to all room IDs', async () => {
      const mockComm = {
        id: 'comm-1',
        updates: { id: 'room-1' },
      } as ICommunication;

      const result = await service.addContributorToCommunications(
        mockComm,
        'actor-1'
      );

      expect(result).toBe(true);
      expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith(
        'actor-1',
        ['room-1']
      );
    });

    it('should return true without calling adapter when actorID is empty', async () => {
      const mockComm = {
        id: 'comm-1',
        updates: { id: 'room-1' },
      } as ICommunication;

      const result = await service.addContributorToCommunications(mockComm, '');

      expect(result).toBe(true);
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    });
  });

  describe('getRoomIds', () => {
    it('should return array of room IDs from updates', () => {
      const mockComm = {
        id: 'comm-1',
        updates: { id: 'room-1' },
      } as ICommunication;

      const result = service.getRoomIds(mockComm);

      expect(result).toEqual(['room-1']);
    });
  });

  describe('getCommunicationIDsUsed', () => {
    it('should return array of communication IDs', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        getRawMany: vi
          .fn()
          .mockResolvedValue([{ id: 'comm-1' }, { id: 'comm-2' }]),
      };
      communicationRepo.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder) as any;

      const result = await service.getCommunicationIDsUsed();

      expect(result).toEqual(['comm-1', 'comm-2']);
    });

    it('should return empty array when no communications exist', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };
      communicationRepo.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder) as any;

      const result = await service.getCommunicationIDsUsed();

      expect(result).toEqual([]);
    });
  });

  describe('removeActorFromCommunications', () => {
    it('should remove actor from all room IDs', async () => {
      const mockComm = {
        id: 'comm-1',
        updates: { id: 'room-1' },
      } as ICommunication;

      const result = await service.removeActorFromCommunications(
        mockComm,
        'actor-1'
      );

      expect(result).toBe(true);
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
        'actor-1',
        ['room-1']
      );
    });
  });
});
