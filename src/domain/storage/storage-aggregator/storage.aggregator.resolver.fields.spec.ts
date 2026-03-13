import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorResolverFields } from './storage.aggregator.resolver.fields';
import { StorageAggregatorService } from './storage.aggregator.service';

describe('StorageAggregatorResolverFields', () => {
  let resolver: StorageAggregatorResolverFields;
  let storageAggregatorService: StorageAggregatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<StorageAggregatorResolverFields>(
      StorageAggregatorResolverFields
    );
    storageAggregatorService = module.get<StorageAggregatorService>(
      StorageAggregatorService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('size', () => {
    it('should delegate to storageAggregatorService.size', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      (storageAggregatorService.size as Mock).mockResolvedValue(42);

      const result = await resolver.size(aggregator);

      expect(result).toBe(42);
      expect(storageAggregatorService.size).toHaveBeenCalledWith(aggregator);
    });
  });

  describe('childStorageAggregators', () => {
    it('should delegate to storageAggregatorService.getChildStorageAggregators', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      const children = [{ id: 'child-1' }, { id: 'child-2' }];
      (
        storageAggregatorService.getChildStorageAggregators as Mock
      ).mockResolvedValue(children);

      const result = await resolver.childStorageAggregators(aggregator);

      expect(result).toEqual(children);
      expect(
        storageAggregatorService.getChildStorageAggregators
      ).toHaveBeenCalledWith(aggregator);
    });
  });

  describe('directStorageBucket', () => {
    it('should delegate to storageAggregatorService.getDirectStorageBucket', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      const bucket = { id: 'bucket-1' };
      (
        storageAggregatorService.getDirectStorageBucket as Mock
      ).mockResolvedValue(bucket);

      const result = await resolver.directStorageBucket(aggregator);

      expect(result).toEqual(bucket);
      expect(
        storageAggregatorService.getDirectStorageBucket
      ).toHaveBeenCalledWith(aggregator);
    });
  });

  describe('storageBuckets', () => {
    it('should delegate to storageAggregatorService.getStorageBuckets', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      const buckets = [{ id: 'bucket-1' }, { id: 'bucket-2' }];
      (storageAggregatorService.getStorageBuckets as Mock).mockResolvedValue(
        buckets
      );

      const result = await resolver.storageBuckets(aggregator);

      expect(result).toEqual(buckets);
      expect(storageAggregatorService.getStorageBuckets).toHaveBeenCalledWith(
        aggregator
      );
    });
  });

  describe('parentEntity', () => {
    it('should delegate to storageAggregatorService.getParentEntity', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      const parentInfo = {
        id: 'space-1',
        displayName: 'My Space',
        url: '/spaces/space-1',
      };
      (storageAggregatorService.getParentEntity as Mock).mockResolvedValue(
        parentInfo
      );

      const result = await resolver.parentEntity(aggregator);

      expect(result).toEqual(parentInfo);
      expect(storageAggregatorService.getParentEntity).toHaveBeenCalledWith(
        aggregator
      );
    });
  });
});
