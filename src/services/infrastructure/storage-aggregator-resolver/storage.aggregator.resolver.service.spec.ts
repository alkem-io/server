import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { StorageAggregatorResolverService } from './storage.aggregator.resolver.service';

describe('StorageAggregatorResolverService', () => {
  let service: StorageAggregatorResolverService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorResolverService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(StorageAggregatorResolverService);
    db = module.get(DRIZZLE);
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storage aggregator when found', async () => {
      const mockAggregator = { id: 'sa-1' };
      db.query.storageAggregators.findFirst.mockResolvedValueOnce(mockAggregator);

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
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      const result = await service.getParentAccountForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when no account found', async () => {
      db.query.accounts.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getParentAccountForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getParentSpaceForStorageAggregator', () => {
    it('should return space when found for storage aggregator', async () => {
      const mockSpace = { id: 'space-1', about: { profile: {} } };
      db.query.spaces.findFirst.mockResolvedValueOnce(mockSpace);

      const result = await service.getParentSpaceForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when no space found', async () => {
      db.query.spaces.findFirst.mockResolvedValueOnce(null);

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

      // spaces.findFirst with storageAggregator
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        storageAggregator: mockAggregator,
      });
      // getStorageAggregatorOrFail
      db.query.storageAggregators.findFirst.mockResolvedValueOnce(mockAggregator);

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via platform when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-2' };

      // spaces.findFirst returns null
      db.query.spaces.findFirst.mockResolvedValueOnce(null);
      // platforms.findFirst returns platform with storageAggregatorId
      db.query.platforms.findFirst.mockResolvedValueOnce({
        storageAggregatorId: 'sa-2',
      });
      // getStorageAggregatorOrFail
      db.query.storageAggregators.findFirst.mockResolvedValueOnce(mockAggregator);

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw NotImplementedException when neither space nor platform found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      db.query.spaces.findFirst.mockResolvedValueOnce(null);
      db.query.platforms.findFirst.mockResolvedValueOnce(null);

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

      // collaborations.findFirst
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      // spaces.findFirst with storageAggregator
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        storageAggregator: mockAggregator,
      });
      // getStorageAggregatorOrFail
      db.query.storageAggregators.findFirst.mockResolvedValueOnce(mockAggregator);

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via virtual contributor when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-vc' };

      // collaborations.findFirst returns null (no collaboration)
      db.query.collaborations.findFirst.mockResolvedValueOnce(null);
      // knowledgeBases.findFirst
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce({ id: 'kb-1' });
      // virtualContributors.findFirst with account.storageAggregator
      db.query.virtualContributors.findFirst.mockResolvedValueOnce({
        id: 'vc-1',
        account: { storageAggregator: mockAggregator },
      });
      // getStorageAggregatorOrFail
      db.query.storageAggregators.findFirst.mockResolvedValueOnce(mockAggregator);

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when neither space nor virtual contributor found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      db.query.collaborations.findFirst.mockResolvedValueOnce(null);
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(null);

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

      db.query.templatesManagers.findFirst.mockResolvedValueOnce(null);
      db.query.innovationPacks.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getStorageAggregatorForTemplatesSet(validUuid)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
