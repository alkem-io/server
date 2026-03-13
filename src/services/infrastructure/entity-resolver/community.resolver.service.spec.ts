import { RoomType } from '@common/enums/room.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Community } from '@domain/community/community';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { EntityManager } from 'typeorm';
import { type Mock, type Mocked, vi } from 'vitest';
import { CommunityResolverService } from './community.resolver.service';

describe('CommunityResolverService', () => {
  let service: CommunityResolverService;
  let entityManager: Mocked<EntityManager> & {
    connection: { query: Mock };
  };
  let _communityRepository: Record<string, Mock>;
  let _communicationRepository: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityResolverService,
        repositoryProviderMockFactory(Community),
        repositoryProviderMockFactory(Communication),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityResolverService);
    entityManager = module.get(getEntityManagerToken());
    (entityManager as any).connection = { query: vi.fn() };
    _communityRepository = module.get(getRepositoryToken(Community));
    _communicationRepository = module.get(getRepositoryToken(Communication));
  });

  describe('getLevelZeroSpaceIdForRoleSet', () => {
    it('should return levelZeroSpaceID when space exists', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        levelZeroSpaceID: 'level0-space-1',
      } as any);

      const result = await service.getLevelZeroSpaceIdForRoleSet('roleset-1');

      expect(result).toBe('level0-space-1');
    });

    it('should throw EntityNotFoundException when no space found for roleSet', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getLevelZeroSpaceIdForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getLevelZeroSpaceIdForMediaGallery', () => {
    it('should return levelZeroSpaceID when space exists', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        levelZeroSpaceID: 'level0-space-1',
      } as any);

      const result = await service.getLevelZeroSpaceIdForMediaGallery('mg-1');

      expect(result).toBe('level0-space-1');
    });

    it('should throw EntityNotFoundException when no space found for media gallery', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getLevelZeroSpaceIdForMediaGallery('missing-mg')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityForRoleSet', () => {
    it('should return community when found via roleSet', async () => {
      const community = { id: 'community-1' };
      entityManager.findOne.mockResolvedValue(community as any);

      const result = await service.getCommunityForRoleSet('roleset-1');

      expect(result).toBe(community);
    });

    it('should throw EntityNotFoundException when no community found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunityForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunicationForRoleSet', () => {
    it('should return communication when community has it', async () => {
      const communication = { id: 'comm-1' };
      entityManager.findOne.mockResolvedValue({
        id: 'community-1',
        communication,
      } as any);

      const result = await service.getCommunicationForRoleSet('roleset-1');

      expect(result).toBe(communication);
    });

    it('should throw when community found but communication is null', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'community-1',
        communication: null,
      } as any);

      await expect(
        service.getCommunicationForRoleSet('roleset-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when no community found at all', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunicationForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isRoleSetAccountMatchingVcAccount', () => {
    it('should return true when VC belongs to the same account as roleSet', async () => {
      // First call: getLevelZeroSpaceIdForRoleSet -> findOne Space
      entityManager.findOne
        .mockResolvedValueOnce({ levelZeroSpaceID: 'l0-space' } as any)
        // Second call: getAccountForRoleSetOrFail -> findOne Space with account
        .mockResolvedValueOnce({
          id: 'l0-space',
          account: { id: 'account-1' },
        } as any);
      // Third call: count VirtualContributor
      entityManager.count.mockResolvedValue(1);

      const result = await service.isRoleSetAccountMatchingVcAccount(
        'roleset-1',
        'vc-1'
      );

      expect(result).toBe(true);
    });

    it('should return false when VC does not belong to the same account', async () => {
      entityManager.findOne
        .mockResolvedValueOnce({ levelZeroSpaceID: 'l0-space' } as any)
        .mockResolvedValueOnce({
          id: 'l0-space',
          account: { id: 'account-1' },
        } as any);
      entityManager.count.mockResolvedValue(0);

      const result = await service.isRoleSetAccountMatchingVcAccount(
        'roleset-1',
        'vc-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('getCommunityFromRoom', () => {
    it('should delegate to getCommunityFromCollaborationCalloutRoomOrFail for CALLOUT rooms', async () => {
      const community = { id: 'community-1' };
      const space = { community };
      entityManager.findOne.mockResolvedValue(space as any);

      const result = await service.getCommunityFromRoom(
        'comments-1',
        RoomType.CALLOUT
      );

      expect(result).toBe(community);
    });

    it('should delegate to getCommunityFromPostRoomOrFail for POST rooms', async () => {
      const community = { id: 'community-2' };
      const space = { community };
      entityManager.findOne.mockResolvedValue(space as any);

      const result = await service.getCommunityFromRoom(
        'comments-1',
        RoomType.POST
      );

      expect(result).toBe(community);
    });

    it('should throw EntityNotFoundException for unsupported room types', async () => {
      await expect(
        service.getCommunityFromRoom('id-1', RoomType.UPDATES)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromWhiteboardOrFail', () => {
    it('should check contributions first, then framing if not found', async () => {
      const community = { id: 'comm-1', roleSet: {} };
      entityManager.findOne
        .mockResolvedValueOnce(null) // contributions check
        .mockResolvedValueOnce({ community } as any); // framing check

      const result = await service.getCommunityFromWhiteboardOrFail('wb-1');

      expect(result).toBe(community);
      expect(entityManager.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw when whiteboard not found in contributions or framing', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.getCommunityFromWhiteboardOrFail('wb-missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityForMemoOrFail', () => {
    it('should throw when no space found for memo', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getCommunityForMemoOrFail('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw when space found but community is null', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        community: null,
      } as any);

      await expect(service.getCommunityForMemoOrFail('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return community when space and community found', async () => {
      const community = { id: 'comm-1' };
      entityManager.findOne.mockResolvedValue({
        id: 'space-1',
        community,
      } as any);

      const result = await service.getCommunityForMemoOrFail('memo-1');
      expect(result).toBe(community);
    });
  });

  describe('getLevelZeroSpaceIdForCommunity', () => {
    it('should return levelZeroSpaceID when space found', async () => {
      entityManager.findOne.mockResolvedValue({
        levelZeroSpaceID: 'l0-space',
      } as any);

      const result = await service.getLevelZeroSpaceIdForCommunity('comm-1');
      expect(result).toBe('l0-space');
    });

    it('should throw when no space found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getLevelZeroSpaceIdForCommunity('comm-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getLevelZeroSpaceIdForCalloutsSet', () => {
    it('should return levelZeroSpaceID when space found', async () => {
      entityManager.findOne.mockResolvedValue({
        levelZeroSpaceID: 'l0-space',
      } as any);

      const result = await service.getLevelZeroSpaceIdForCalloutsSet('cs-1');
      expect(result).toBe('l0-space');
    });

    it('should throw when no space found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getLevelZeroSpaceIdForCalloutsSet('cs-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromCollaborationCalloutOrFail', () => {
    it('should return community when space and community found', async () => {
      const community = { id: 'comm-1' };
      entityManager.findOne.mockResolvedValue({
        community,
      } as any);

      const result =
        await service.getCommunityFromCollaborationCalloutOrFail('callout-1');
      expect(result).toBe(community);
    });

    it('should throw when no space found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunityFromCollaborationCalloutOrFail('callout-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when space found but community is null', async () => {
      entityManager.findOne.mockResolvedValue({
        community: null,
      } as any);

      await expect(
        service.getCommunityFromCollaborationCalloutOrFail('callout-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCollaborationLicenseFromWhiteboardOrFail', () => {
    it('should return license from contributions check', async () => {
      const license = { id: 'lic-1', entitlements: [] };
      entityManager.findOne.mockResolvedValueOnce({
        license,
      } as any);

      const result =
        await service.getCollaborationLicenseFromWhiteboardOrFail('wb-1');
      expect(result).toBe(license);
    });

    it('should check framing if contributions return null', async () => {
      const license = { id: 'lic-2', entitlements: [] };
      entityManager.findOne
        .mockResolvedValueOnce(null) // contributions
        .mockResolvedValueOnce({ license } as any); // framing

      const result =
        await service.getCollaborationLicenseFromWhiteboardOrFail('wb-1');
      expect(result).toBe(license);
    });

    it('should throw when neither contributions nor framing found', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.getCollaborationLicenseFromWhiteboardOrFail('wb-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCollaborationLicenseFromMemoOrFail', () => {
    it('should return license from contributions check', async () => {
      const license = { id: 'lic-1', entitlements: [] };
      entityManager.findOne.mockResolvedValueOnce({
        license,
      } as any);

      const result =
        await service.getCollaborationLicenseFromMemoOrFail('memo-1');
      expect(result).toBe(license);
    });

    it('should check framing if contributions return null', async () => {
      const license = { id: 'lic-2', entitlements: [] };
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ license } as any);

      const result =
        await service.getCollaborationLicenseFromMemoOrFail('memo-1');
      expect(result).toBe(license);
    });

    it('should throw when neither found', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.getCollaborationLicenseFromMemoOrFail('memo-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getSpaceForRoleSetOrFail', () => {
    it('should return space when found', async () => {
      const space = {
        id: 'space-1',
        about: { profile: { displayName: 'Test' } },
      };
      entityManager.findOne.mockResolvedValue(space as any);

      const result = await service.getSpaceForRoleSetOrFail('rs-1');
      expect(result).toBe(space);
    });

    it('should throw when not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getSpaceForRoleSetOrFail('rs-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getSpaceForCommunityOrFail', () => {
    it('should return space when found', async () => {
      const space = { id: 'space-1', about: { profile: {} }, community: {} };
      entityManager.findOne.mockResolvedValue(space as any);

      const result = await service.getSpaceForCommunityOrFail('comm-1');
      expect(result).toBe(space);
    });

    it('should throw when not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getSpaceForCommunityOrFail('comm-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getSpaceForCollaborationOrFail', () => {
    it('should return space when found', async () => {
      const space = { id: 'space-1', about: { profile: {} } };
      entityManager.findOne.mockResolvedValue(space as any);

      const result = await service.getSpaceForCollaborationOrFail('collab-1');
      expect(result).toBe(space);
    });

    it('should throw when not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getSpaceForCollaborationOrFail('collab-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getDisplayNameForRoleSetOrFail', () => {
    it('should return displayName from space about profile', async () => {
      entityManager.findOne.mockResolvedValue({
        about: { profile: { displayName: 'My Space' } },
      } as any);

      const result = await service.getDisplayNameForRoleSetOrFail('rs-1');
      expect(result).toBe('My Space');
    });
  });

  describe('getCommunityFromCollaborationCalloutRoomOrFail', () => {
    it('should return community when found', async () => {
      const community = { id: 'comm-1', roleSet: {} };
      entityManager.findOne.mockResolvedValue({ community } as any);

      const result =
        await service.getCommunityFromCollaborationCalloutRoomOrFail(
          'comments-1'
        );
      expect(result).toBe(community);
    });

    it('should throw when space not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunityFromCollaborationCalloutRoomOrFail('comments-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromPostRoomOrFail', () => {
    it('should return community when found', async () => {
      const community = { id: 'comm-1', roleSet: {} };
      entityManager.findOne.mockResolvedValue({ community } as any);

      const result = await service.getCommunityFromPostRoomOrFail('comments-1');
      expect(result).toBe(community);
    });

    it('should throw when space not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunityFromPostRoomOrFail('comments-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromCalendarEventOrFail', () => {
    it('should return community when found', async () => {
      const community = { id: 'comm-1' };
      entityManager.connection.query.mockResolvedValue([
        { communityId: 'comm-1' },
      ]);
      _communityRepository.findOneBy.mockResolvedValue(community);

      const result =
        await service.getCommunityFromCalendarEventOrFail('event-1');
      expect(result).toBe(community);
    });

    it('should throw when community not found', async () => {
      entityManager.connection.query.mockResolvedValue([
        { communityId: 'comm-1' },
      ]);
      _communityRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.getCommunityFromCalendarEventOrFail('event-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromUpdatesOrFail', () => {
    it('should return community when found', async () => {
      const community = { id: 'comm-1' };
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'communication-1' }),
      };
      _communicationRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const communityQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(community),
      };
      _communityRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(communityQueryBuilder);

      const result = await service.getCommunityFromUpdatesOrFail('updates-1');
      expect(result).toBe(community);
    });

    it('should throw when community not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'communication-1' }),
      };
      _communicationRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const communityQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      _communityRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(communityQueryBuilder);

      await expect(
        service.getCommunityFromUpdatesOrFail('updates-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
