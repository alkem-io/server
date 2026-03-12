import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Community } from '@domain/community/community/community.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let communityRepo: {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    communityRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: getRepositoryToken(Community),
          useValue: communityRepo,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunityService>(CommunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommunityOrFail', () => {
    it('should return community when found', async () => {
      const mockCommunity = { id: 'comm-1', groups: [] };
      communityRepo.findOne.mockResolvedValue(mockCommunity);

      const result = await service.getCommunityOrFail('comm-1');

      expect(result).toBe(mockCommunity);
      expect(communityRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'comm-1' } })
      );
    });

    it('should throw EntityNotFoundException when not found', async () => {
      communityRepo.findOne.mockResolvedValue(null);

      await expect(service.getCommunityOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getUserGroups', () => {
    it('should return groups when community has groups', async () => {
      const groups = [{ id: 'g-1' }, { id: 'g-2' }];
      communityRepo.findOne.mockResolvedValue({ id: 'comm-1', groups });

      const result = await service.getUserGroups({ id: 'comm-1' } as any);

      expect(result).toBe(groups);
    });

    it('should throw EntityNotInitializedException when groups not loaded', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        groups: undefined,
      });

      await expect(
        service.getUserGroups({ id: 'comm-1' } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getUserGroup', () => {
    it('should return the matching group', async () => {
      const groups = [
        { id: 'g-1', name: 'Group 1' },
        { id: 'g-2', name: 'Group 2' },
      ];
      communityRepo.findOne.mockResolvedValue({ id: 'comm-1', groups });

      const result = await service.getUserGroup({ id: 'comm-1' } as any, 'g-2');

      expect(result.id).toBe('g-2');
    });

    it('should throw EntityNotFoundException when group not found', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        groups: [{ id: 'g-1' }],
      });

      await expect(
        service.getUserGroup({ id: 'comm-1' } as any, 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotInitializedException when groups not loaded', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        groups: undefined,
      });

      await expect(
        service.getUserGroup({ id: 'comm-1' } as any, 'g-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('save', () => {
    it('should save and return community', async () => {
      const community = { id: 'comm-1' } as any;
      communityRepo.save.mockResolvedValue(community);

      const result = await service.save(community);

      expect(result).toBe(community);
      expect(communityRepo.save).toHaveBeenCalledWith(community);
    });
  });

  describe('getRoleSet', () => {
    it('should return roleSet when loaded', async () => {
      const roleSet = { id: 'rs-1' };
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        roleSet,
      });

      const result = await service.getRoleSet({ id: 'comm-1' } as any);

      expect(result).toBe(roleSet);
    });

    it('should throw when roleSet not loaded', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        roleSet: undefined,
      });

      await expect(service.getRoleSet({ id: 'comm-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getCommunication', () => {
    it('should return communication when loaded', async () => {
      const communication = { id: 'comms-1' };
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        communication,
      });

      const result = await service.getCommunication('comm-1');

      expect(result).toBe(communication);
    });

    it('should throw when communication not loaded', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        communication: undefined,
      });

      await expect(service.getCommunication('comm-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('removeCommunityOrFail', () => {
    it('should throw RelationshipNotFoundException when child entities missing', async () => {
      communityRepo.findOne.mockResolvedValue({
        id: 'comm-1',
        communication: undefined,
        roleSet: undefined,
        groups: undefined,
      });

      await expect(service.removeCommunityOrFail('comm-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
