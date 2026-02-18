import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { VirtualActorLookupService } from './virtual.contributor.lookup.service';

describe('VirtualActorLookupService', () => {
  let service: VirtualActorLookupService;
  let entityManager: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualActorLookupService,
        repositoryProviderMockFactory(VirtualContributor),
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualActorLookupService);
  });

  describe('getVirtualContributorOrFail', () => {
    it('should throw EntityNotFoundException when the ID is not a valid UUID', async () => {
      await expect(
        service.getVirtualContributorByIdOrFail('not-a-uuid')
      ).rejects.toThrow(EntityNotFoundException);

      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should return the virtual contributor when found by valid UUID', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, nameID: 'test-vc' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorByIdOrFail(validId);
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor is found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByIdOrFail(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorAndActor', () => {
    it('should return virtual contributor and actorId when VC is found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockCredentials = [{ id: 'cred-1' }];
      const mockVC = { id: validId, credentials: mockCredentials };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorAndActor(validId);
      expect(result.virtualContributor).toBe(mockVC);
      expect(result.actorId).toBe(validId);
      expect(result.credentials).toBe(mockCredentials);
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorAndActor(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorById', () => {
    it('should return the virtual contributor when found by ID', async () => {
      const mockVC = { id: 'vc-1' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result).toBe(mockVC);
    });

    it('should return null when no virtual contributor matches the ID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getVirtualContributorById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
      );
      expect(result).toBeNull();
    });
  });

  describe('getVirtualContributorByIdOrFail', () => {
    it('should return the virtual contributor when found', async () => {
      const mockVC = { id: 'vc-1' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorByIdOrFail(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor matches', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByIdOrFail(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorByNameIdOrFail', () => {
    it('should return the virtual contributor when found by nameID', async () => {
      const mockVC = { id: 'vc-1', nameID: 'test-vc' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result =
        await service.getVirtualContributorByNameIdOrFail('test-vc');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when nameID does not match', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('virtualContributorsWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.virtualContributorsWithCredentials({
        type: 'space-admin' as any,
      });

      // VirtualContributor IS an Actor - credentials are directly on the entity
      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            credentials: {
              type: 'space-admin',
              resourceID: '',
            },
          },
        })
      );
    });

    it('should pass the limit to the query', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.virtualContributorsWithCredentials(
        { type: 'vc-member' as any, resourceID: 'res-1' },
        5
      );

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('getAccountOrFail', () => {
    it('should return the account when it is loaded on the virtual contributor', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockAccount = { id: 'account-1' };
      const mockVC = { id: validId, account: mockAccount };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getAccountOrFail(validId);
      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotInitializedException when account is not loaded', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, account: undefined };
      entityManager.findOne.mockResolvedValue(mockVC);

      await expect(service.getAccountOrFail(validId)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });
});
