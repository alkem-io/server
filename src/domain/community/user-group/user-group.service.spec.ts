import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { UserGroupService } from './user-group.service';

describe('UserGroupService', () => {
  let service: UserGroupService;
  let userGroupRepo: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userGroupRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        {
          provide: getRepositoryToken(UserGroup),
          useValue: userGroupRepo,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<UserGroupService>(UserGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserGroupOrFail', () => {
    it('should return group when found', async () => {
      const mockGroup = { id: 'g-1', profile: { displayName: 'Test' } };
      userGroupRepo.findOne.mockResolvedValue(mockGroup);

      const result = await service.getUserGroupOrFail('g-1');

      expect(result).toBe(mockGroup);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      userGroupRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserGroupOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getParent', () => {
    it('should return community when group belongs to community', async () => {
      const community = { id: 'comm-1' };
      userGroupRepo.findOne.mockResolvedValue({
        id: 'g-1',
        community,
        organization: undefined,
      });

      const result = await service.getParent({ id: 'g-1' } as any);

      expect(result).toBe(community);
    });

    it('should return organization when group belongs to organization', async () => {
      const organization = { id: 'org-1' };
      userGroupRepo.findOne.mockResolvedValue({
        id: 'g-1',
        community: undefined,
        organization,
      });

      const result = await service.getParent({ id: 'g-1' } as any);

      expect(result).toBe(organization);
    });

    it('should throw when no parent found', async () => {
      userGroupRepo.findOne.mockResolvedValue({
        id: 'g-1',
        community: undefined,
        organization: undefined,
      });

      await expect(
        service.getParent({
          id: 'g-1',
          profile: { displayName: 'Orphan' },
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('saveUserGroup', () => {
    it('should save and return user group', async () => {
      const group = { id: 'g-1' } as any;
      userGroupRepo.save.mockResolvedValue(group);

      const result = await service.saveUserGroup(group);

      expect(result).toBe(group);
    });
  });

  describe('getGroups', () => {
    it('should return groups from repository', async () => {
      const groups = [{ id: 'g-1' }, { id: 'g-2' }];
      userGroupRepo.find.mockResolvedValue(groups);

      const result = await service.getGroups();

      expect(result).toBe(groups);
    });

    it('should return empty array when no groups found', async () => {
      userGroupRepo.find.mockResolvedValue(null);

      const result = await service.getGroups();

      expect(result).toEqual([]);
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', () => {
      const profile = { id: 'p-1', displayName: 'Test' };
      const group = { id: 'g-1', profile } as any;

      const result = service.getProfile(group);

      expect(result).toBe(profile);
    });

    it('should throw when profile not initialized', () => {
      const group = { id: 'g-1', profile: undefined } as any;

      expect(() => service.getProfile(group)).toThrow(
        EntityNotInitializedException
      );
    });
  });
});
