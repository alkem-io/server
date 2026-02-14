import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Repository } from 'typeorm';
import { Space } from '../space/space.entity';
import { ISpace } from '../space/space.interface';
import { SpaceLookupService } from './space.lookup.service';
import { AccountLookupService } from '../account.lookup/account.lookup.service';

describe('SpaceLookupService', () => {
  let service: SpaceLookupService;
  let spaceRepository: Repository<Space>;
  let entityManager: any;
  let accountLookupService: AccountLookupService;

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceLookupService,
        MockWinstonProvider,
        repositoryProviderMockFactory(Space),
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceLookupService);
    spaceRepository = module.get<Repository<Space>>(getRepositoryToken(Space));
    accountLookupService = module.get(AccountLookupService);
  });

  describe('getSpaceOrFail', () => {
    it('should return space when found', async () => {
      // Arrange
      const mockSpace = { id: 'space-1' } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act
      const result = await service.getSpaceOrFail('space-1');

      // Assert
      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space not found', async () => {
      // Arrange
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSpaceOrFail('missing-id')).rejects.toThrow(
        'Unable to find Space on Host with ID: missing-id'
      );
    });
  });

  describe('getSpaceForSpaceAboutOrFail', () => {
    it('should return space when found by about ID', async () => {
      // Arrange
      const mockSpace = { id: 'space-1' } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act
      const result = await service.getSpaceForSpaceAboutOrFail('about-1');

      // Assert
      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space not found for about ID', async () => {
      // Arrange
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSpaceForSpaceAboutOrFail('about-missing')
      ).rejects.toThrow(
        'Unable to find Space with about with ID: about-missing'
      );
    });
  });

  describe('getSpaceByNameIdOrFail', () => {
    it('should return space when found by nameID', async () => {
      // Arrange
      const mockSpace = { id: 'space-1', nameID: 'my-space' } as ISpace;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        mockSpace as Space
      );

      // Act
      const result = await service.getSpaceByNameIdOrFail('my-space');

      // Assert
      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space with nameID not found', async () => {
      // Arrange
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSpaceByNameIdOrFail('nonexistent')
      ).rejects.toThrow(
        'Unable to find L0 Space with nameID: nonexistent'
      );
    });
  });

  describe('spacesExist', () => {
    it('should return true when called with empty array', async () => {
      // Act
      const result = await service.spacesExist([]);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when all spaces exist', async () => {
      // Arrange
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { id: 'space-1' } as Space,
        { id: 'space-2' } as Space,
      ]);

      // Act
      const result = await service.spacesExist(['space-1', 'space-2']);

      // Assert
      expect(result).toBe(true);
    });

    it('should return all IDs when no spaces found', async () => {
      // Arrange
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.spacesExist(['space-1', 'space-2']);

      // Assert
      expect(result).toEqual(['space-1', 'space-2']);
    });

    it('should return missing IDs when only some spaces exist', async () => {
      // Arrange
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { id: 'space-1' } as Space,
      ]);

      // Act
      const result = await service.spacesExist(['space-1', 'space-2']);

      // Assert
      expect(result).toEqual(['space-2']);
    });
  });

  describe('getCollaborationOrFail', () => {
    it('should return collaboration when found', async () => {
      // Arrange
      const mockCollaboration = { id: 'collab-1' };
      const mockSpace = {
        id: 'space-1',
        collaboration: mockCollaboration,
      } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act
      const result = await service.getCollaborationOrFail('space-1');

      // Assert
      expect(result).toBe(mockCollaboration);
    });

    it('should throw RelationshipNotFoundException when collaboration is not loaded', async () => {
      // Arrange
      const mockSpace = {
        id: 'space-1',
        collaboration: undefined,
      } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act & Assert
      await expect(
        service.getCollaborationOrFail('space-1')
      ).rejects.toThrow(
        'Unable to load collaboration for space space-1'
      );
    });

    it('should throw EntityNotFoundException when space not found', async () => {
      // Arrange
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getCollaborationOrFail('missing-id')
      ).rejects.toThrow(
        'Unable to find Space on Host with ID: missing-id'
      );
    });
  });

  describe('getProvider', () => {
    it('should return null and log warning when space not found for about', async () => {
      // Arrange
      const spaceAbout = { id: 'about-1' };
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.getProvider(spaceAbout as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when L0 space not found', async () => {
      // Arrange
      const spaceAbout = { id: 'about-1' };
      const mockSpace = {
        id: 'space-1',
        levelZeroSpaceID: 'l0-space-1',
      } as Space;
      vi.spyOn(spaceRepository, 'findOne')
        .mockResolvedValueOnce(mockSpace) // first call: find space for about
        .mockResolvedValueOnce(null); // second call: find L0 space

      // Act
      const result = await service.getProvider(spaceAbout as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when L0 space has no account', async () => {
      // Arrange
      const spaceAbout = { id: 'about-1' };
      const mockSpace = {
        id: 'space-1',
        levelZeroSpaceID: 'l0-space-1',
      } as Space;
      const mockL0Space = {
        id: 'l0-space-1',
        account: undefined,
      } as Space;
      vi.spyOn(spaceRepository, 'findOne')
        .mockResolvedValueOnce(mockSpace)
        .mockResolvedValueOnce(mockL0Space);

      // Act
      const result = await service.getProvider(spaceAbout as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should delegate to accountLookupService.getHost when account found', async () => {
      // Arrange
      const spaceAbout = { id: 'about-1' };
      const mockAccount = { id: 'account-1' };
      const mockSpace = {
        id: 'space-1',
        levelZeroSpaceID: 'l0-space-1',
      } as Space;
      const mockL0Space = {
        id: 'l0-space-1',
        account: mockAccount,
      } as Space;
      const mockHost = { id: 'user-1' };
      vi.spyOn(spaceRepository, 'findOne')
        .mockResolvedValueOnce(mockSpace)
        .mockResolvedValueOnce(mockL0Space);
      accountLookupService.getHost = vi.fn().mockResolvedValue(mockHost);

      // Act
      const result = await service.getProvider(spaceAbout as any);

      // Assert
      expect(result).toBe(mockHost);
      expect(accountLookupService.getHost).toHaveBeenCalledWith(mockAccount);
    });
  });

  describe('getAllDescendantSpaceIDs', () => {
    it('should return empty array when space has no subspaces', async () => {
      // Arrange
      const mockSpace = {
        id: 'space-1',
        subspaces: [],
      } as unknown as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act
      const result = await service.getAllDescendantSpaceIDs('space-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return direct subspace IDs', async () => {
      // Arrange
      const mockSpace = {
        id: 'space-1',
        subspaces: [
          { id: 'sub-1', subspaces: [] },
          { id: 'sub-2', subspaces: [] },
        ],
      } as unknown as ISpace;

      entityManager.findOne.mockImplementation(
        (_entity: any, options: any) => {
          if (options.where.id === 'space-1') return mockSpace;
          if (options.where.id === 'sub-1')
            return { id: 'sub-1', subspaces: [] };
          if (options.where.id === 'sub-2')
            return { id: 'sub-2', subspaces: [] };
          return null;
        }
      );

      // Act
      const result = await service.getAllDescendantSpaceIDs('space-1');

      // Assert
      expect(result).toContain('sub-1');
      expect(result).toContain('sub-2');
      expect(result).toHaveLength(2);
    });

    it('should return nested descendant IDs recursively', async () => {
      // Arrange
      entityManager.findOne.mockImplementation(
        (_entity: any, options: any) => {
          const id = options.where.id;
          if (id === 'space-1')
            return { id: 'space-1', subspaces: [{ id: 'sub-1' }] };
          if (id === 'sub-1')
            return { id: 'sub-1', subspaces: [{ id: 'sub-1-1' }] };
          if (id === 'sub-1-1')
            return { id: 'sub-1-1', subspaces: [] };
          return null;
        }
      );

      // Act
      const result = await service.getAllDescendantSpaceIDs('space-1');

      // Assert
      expect(result).toContain('sub-1');
      expect(result).toContain('sub-1-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when subspaces is undefined', async () => {
      // Arrange
      const mockSpace = {
        id: 'space-1',
        subspaces: undefined,
      } as unknown as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      // Act
      const result = await service.getAllDescendantSpaceIDs('space-1');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
