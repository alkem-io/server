import { IActor } from '@domain/actor/actor/actor.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { AccountLookupService } from '../account.lookup/account.lookup.service';
import { Space } from '../space/space.entity';
import { ISpace } from '../space/space.interface';
import { SpaceLookupService } from './space.lookup.service';

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
      const mockSpace = { id: 'space-1' } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getSpaceOrFail('space-1');

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getSpaceOrFail('missing-id')).rejects.toThrow(
        'Unable to find Space on Host with ID: missing-id'
      );
    });
  });

  describe('getSpaceForSpaceAboutOrFail', () => {
    it('should return space when found by about ID', async () => {
      const mockSpace = { id: 'space-1' } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getSpaceForSpaceAboutOrFail('about-1');

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space not found for about ID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getSpaceForSpaceAboutOrFail('about-missing')
      ).rejects.toThrow(
        'Unable to find Space with about with ID: about-missing'
      );
    });
  });

  describe('getSpaceByNameIdOrFail', () => {
    it('should return space when found by nameID', async () => {
      const mockSpace = { id: 'space-1', nameID: 'my-space' } as ISpace;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        mockSpace as Space
      );

      const result = await service.getSpaceByNameIdOrFail('my-space');

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space with nameID not found', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSpaceByNameIdOrFail('nonexistent')
      ).rejects.toThrow('Unable to find L0 Space with nameID: nonexistent');
    });
  });

  describe('spacesExist', () => {
    it('should return true when called with empty array', async () => {
      const result = await service.spacesExist([]);

      expect(result).toBe(true);
    });

    it('should return true when all spaces exist', async () => {
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { id: 'space-1' } as Space,
        { id: 'space-2' } as Space,
      ]);

      const result = await service.spacesExist(['space-1', 'space-2']);

      expect(result).toBe(true);
    });

    it('should return all IDs when no spaces found', async () => {
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([]);

      const result = await service.spacesExist(['space-1', 'space-2']);

      expect(result).toEqual(['space-1', 'space-2']);
    });

    it('should return missing IDs when only some spaces exist', async () => {
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { id: 'space-1' } as Space,
      ]);

      const result = await service.spacesExist(['space-1', 'space-2']);

      expect(result).toEqual(['space-2']);
    });
  });

  describe('getCollaborationOrFail', () => {
    it('should return collaboration when found', async () => {
      const mockCollaboration = { id: 'collab-1' };
      const mockSpace = {
        id: 'space-1',
        collaboration: mockCollaboration,
      } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getCollaborationOrFail('space-1');

      expect(result).toBe(mockCollaboration);
    });

    it('should throw RelationshipNotFoundException when collaboration is not loaded', async () => {
      const mockSpace = {
        id: 'space-1',
        collaboration: undefined,
      } as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      await expect(service.getCollaborationOrFail('space-1')).rejects.toThrow(
        'Unable to load collaboration for space space-1'
      );
    });

    it('should throw EntityNotFoundException when space not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCollaborationOrFail('missing-id')
      ).rejects.toThrow('Unable to find Space on Host with ID: missing-id');
    });
  });

  describe('getProvider', () => {
    it('should return null and log warning when space not found for about', async () => {
      const spaceAbout = { id: 'about-1' };
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getProvider(spaceAbout as any);

      expect(result).toBeNull();
    });

    it('should return null when L0 space not found', async () => {
      const spaceAbout = { id: 'about-1' };
      const mockSpace = {
        id: 'space-1',
        levelZeroSpaceID: 'l0-space-1',
      } as Space;
      vi.spyOn(spaceRepository, 'findOne')
        .mockResolvedValueOnce(mockSpace) // first call: find space for about
        .mockResolvedValueOnce(null); // second call: find L0 space

      const result = await service.getProvider(spaceAbout as any);

      expect(result).toBeNull();
    });

    it('should return null when L0 space has no account', async () => {
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

      const result = await service.getProvider(spaceAbout as any);

      expect(result).toBeNull();
    });

    it('should delegate to accountLookupService.getHost when account found', async () => {
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

      const result = await service.getProvider(spaceAbout as any);

      expect(result).toBe(mockHost);
      expect(accountLookupService.getHost).toHaveBeenCalledWith(mockAccount);
    });
  });

  describe('getProviderForSpace', () => {
    function makeSpace(
      id: string,
      levelZeroSpaceID: string,
      account?: { id: string }
    ): ISpace {
      return { id, levelZeroSpaceID, account } as unknown as ISpace;
    }

    it('should skip DB query for L0 space with account already loaded', async () => {
      const space = makeSpace('space-1', 'space-1', { id: 'acc-1' });
      const mockHost = { id: 'user-1' } as IActor;
      accountLookupService.getHost = vi.fn().mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).not.toHaveBeenCalled();
      expect(accountLookupService.getHost).toHaveBeenCalledWith(space.account);
    });

    it('should load from DB for L0 space without account', async () => {
      const space = makeSpace('space-1', 'space-1');
      const dbSpace = makeSpace('space-1', 'space-1', { id: 'acc-1' });
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        dbSpace as unknown as Space
      );
      const mockHost = { id: 'user-1' } as IActor;
      accountLookupService.getHost = vi.fn().mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'space-1' },
        relations: { account: true },
      });
    });

    it('should load L0 space for non-L0 space', async () => {
      const space = makeSpace('subspace-1', 'root-space');
      const l0Space = makeSpace('root-space', 'root-space', { id: 'acc-1' });
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        l0Space as unknown as Space
      );
      const mockHost = { id: 'org-1' } as IActor;
      accountLookupService.getHost = vi.fn().mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'root-space' },
        relations: { account: true },
      });
    });

    it('should return null and log warning when L0 space not found in DB', async () => {
      const space = makeSpace('space-1', 'space-1');
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);
      accountLookupService.getHost = vi.fn();

      const result = await service.getProviderForSpace(space);

      expect(result).toBeNull();
      expect(accountLookupService.getHost).not.toHaveBeenCalled();
    });

    it('should return null and log warning when L0 space has no account', async () => {
      const space = makeSpace('space-1', 'space-1');
      const dbSpace = makeSpace('space-1', 'space-1');
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        dbSpace as unknown as Space
      );
      accountLookupService.getHost = vi.fn();

      const result = await service.getProviderForSpace(space);

      expect(result).toBeNull();
      expect(accountLookupService.getHost).not.toHaveBeenCalled();
    });

    it('should return getHost result for full happy path', async () => {
      const space = makeSpace('sub-1', 'l0-space');
      const l0Space = makeSpace('l0-space', 'l0-space', { id: 'acc-42' });
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(
        l0Space as unknown as Space
      );
      const expectedHost = { id: 'user-42' } as IActor;
      accountLookupService.getHost = vi.fn().mockResolvedValue(expectedHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(expectedHost);
      expect(accountLookupService.getHost).toHaveBeenCalledWith(
        l0Space.account
      );
    });
  });

  describe('getAllDescendantSpaceIDs', () => {
    it('should return empty array when space has no subspaces', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: [],
      } as unknown as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getAllDescendantSpaceIDs('space-1');

      expect(result).toEqual([]);
    });

    it('should return direct subspace IDs', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: [
          { id: 'sub-1', subspaces: [] },
          { id: 'sub-2', subspaces: [] },
        ],
      } as unknown as ISpace;

      entityManager.findOne.mockImplementation((_entity: any, options: any) => {
        if (options.where.id === 'space-1') return mockSpace;
        if (options.where.id === 'sub-1') return { id: 'sub-1', subspaces: [] };
        if (options.where.id === 'sub-2') return { id: 'sub-2', subspaces: [] };
        return null;
      });

      const result = await service.getAllDescendantSpaceIDs('space-1');

      expect(result).toContain('sub-1');
      expect(result).toContain('sub-2');
      expect(result).toHaveLength(2);
    });

    it('should return nested descendant IDs recursively', async () => {
      entityManager.findOne.mockImplementation((_entity: any, options: any) => {
        const id = options.where.id;
        if (id === 'space-1')
          return { id: 'space-1', subspaces: [{ id: 'sub-1' }] };
        if (id === 'sub-1')
          return { id: 'sub-1', subspaces: [{ id: 'sub-1-1' }] };
        if (id === 'sub-1-1') return { id: 'sub-1-1', subspaces: [] };
        return null;
      });

      const result = await service.getAllDescendantSpaceIDs('space-1');

      expect(result).toContain('sub-1');
      expect(result).toContain('sub-1-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when subspaces is undefined', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: undefined,
      } as unknown as ISpace;
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getAllDescendantSpaceIDs('space-1');

      expect(result).toEqual([]);
    });
  });
});
