import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi, type Mock } from 'vitest';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { NotImplementedException } from '@nestjs/common';
import { StorageAggregatorResolverService } from './storage.aggregator.resolver.service';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Repository } from 'typeorm';
import type { MockType } from '@test/utils/mock.type';

describe('StorageAggregatorResolverService', () => {
  let service: StorageAggregatorResolverService;
  let entityManager: {
    findOne: Mock;
    connection: { query: Mock };
  };
  let storageAggregatorRepository: MockType<Repository<StorageAggregator>>;

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
      connection: { query: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorResolverService,
        repositoryProviderMockFactory(StorageAggregator),
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

    service = module.get(StorageAggregatorResolverService);
    storageAggregatorRepository = module.get(
      `${StorageAggregator.name}Repository`
    ) as any;
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storage aggregator when found', async () => {
      const mockAggregator = { id: 'sa-1' };
      vi.spyOn(
        storageAggregatorRepository,
        'findOneOrFail'
      ).mockResolvedValue(mockAggregator);

      const result = await service.getStorageAggregatorOrFail('sa-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when storageAggregatorID is empty', async () => {
      await expect(service.getStorageAggregatorOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getParentAccountForStorageAggregator', () => {
    it('should return account when found for storage aggregator', async () => {
      const mockAccount = { id: 'account-1' };
      entityManager.findOne.mockResolvedValue(mockAccount);

      const result = await service.getParentAccountForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when no account found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentAccountForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getParentSpaceForStorageAggregator', () => {
    it('should return space when found for storage aggregator', async () => {
      const mockSpace = { id: 'space-1', about: { profile: {} } };
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getParentSpaceForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when no space found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentSpaceForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForTemplatesManager', () => {
    it('should throw InvalidUUID when templatesManagerId is not a valid UUID', async () => {
      await expect(
        service.getStorageAggregatorForTemplatesManager('not-a-uuid')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should return storage aggregator via space when space has storageAggregator', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-1' };
      // First call: Space found with storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-1' },
      });
      // getStorageAggregatorOrFail call
      vi.spyOn(
        storageAggregatorRepository,
        'findOneOrFail'
      ).mockResolvedValue(mockAggregator);

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via platform when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-2' };
      // First call: Space not found
      entityManager.findOne.mockResolvedValueOnce(null);
      // Second call: Platform found with storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-2' },
      });
      vi.spyOn(
        storageAggregatorRepository,
        'findOneOrFail'
      ).mockResolvedValue(mockAggregator);

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw NotImplementedException when neither space nor platform found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForTemplatesManager(validUuid)
      ).rejects.toThrow(NotImplementedException);
    });
  });

  describe('getStorageAggregatorForCalloutsSet', () => {
    it('should throw InvalidUUID when calloutsSetID is not valid', async () => {
      await expect(
        service.getStorageAggregatorForCalloutsSet('bad-id')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should return storage aggregator via space when space has storageAggregator', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-1' };
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-1' },
      });
      vi.spyOn(
        storageAggregatorRepository,
        'findOneOrFail'
      ).mockResolvedValue(mockAggregator);

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via virtual contributor when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-vc' };
      // Space not found
      entityManager.findOne.mockResolvedValueOnce(null);
      // VC found with account.storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        account: { storageAggregator: { id: 'sa-vc' } },
      });
      vi.spyOn(
        storageAggregatorRepository,
        'findOneOrFail'
      ).mockResolvedValue(mockAggregator);

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when neither space nor virtual contributor found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForCalloutsSet(validUuid)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForTemplatesSet', () => {
    it('should throw InvalidUUID when templatesSetId is not valid', async () => {
      await expect(
        service.getStorageAggregatorForTemplatesSet('bad-id')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should throw EntityNotFoundException when neither templatesManager nor innovationPack found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForTemplatesSet(validUuid)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
