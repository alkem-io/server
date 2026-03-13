import { ActorContext } from '@core/actor-context/actor.context';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketResolverFields } from './storage.bucket.resolver.fields';
import { StorageBucketService } from './storage.bucket.service';

describe('StorageBucketResolverFields', () => {
  let resolver: StorageBucketResolverFields;
  let storageBucketService: StorageBucketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBucketResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<StorageBucketResolverFields>(
      StorageBucketResolverFields
    );
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('document', () => {
    it('should return a single document by ID', async () => {
      const bucket = { id: 'bucket-1' } as IStorageBucket;
      const actorContext = new ActorContext();
      const doc = { id: 'doc-1', displayName: 'file.png' };
      (storageBucketService.getFilteredDocuments as Mock).mockResolvedValue([
        doc,
      ]);

      const result = await resolver.document(bucket, actorContext, 'doc-1');

      expect(result).toBe(doc);
      expect(storageBucketService.getFilteredDocuments).toHaveBeenCalledWith(
        bucket,
        { IDs: ['doc-1'] },
        actorContext
      );
    });
  });

  describe('documents', () => {
    it('should delegate to storageBucketService.getFilteredDocuments', async () => {
      const bucket = { id: 'bucket-1' } as IStorageBucket;
      const actorContext = new ActorContext();
      const docs = [{ id: 'doc-1' }, { id: 'doc-2' }];
      const args = { limit: 10 };
      (storageBucketService.getFilteredDocuments as Mock).mockResolvedValue(
        docs
      );

      const result = await resolver.documents(bucket, actorContext, args);

      expect(result).toEqual(docs);
      expect(storageBucketService.getFilteredDocuments).toHaveBeenCalledWith(
        bucket,
        args,
        actorContext
      );
    });
  });

  describe('size', () => {
    it('should delegate to storageBucketService.size', async () => {
      const bucket = { id: 'bucket-1' } as IStorageBucket;
      (storageBucketService.size as Mock).mockResolvedValue(1024);

      const result = await resolver.size(bucket);

      expect(result).toBe(1024);
      expect(storageBucketService.size).toHaveBeenCalledWith(bucket);
    });
  });

  describe('parentEntity', () => {
    it('should delegate to storageBucketService.getStorageBucketParent', async () => {
      const bucket = { id: 'bucket-1' } as IStorageBucket;
      const parent = {
        id: 'profile-1',
        type: 'user',
        displayName: 'John',
        url: '/users/john',
      };
      (storageBucketService.getStorageBucketParent as Mock).mockResolvedValue(
        parent
      );

      const result = await resolver.parentEntity(bucket);

      expect(result).toEqual(parent);
      expect(storageBucketService.getStorageBucketParent).toHaveBeenCalledWith(
        bucket
      );
    });

    it('should return null when no parent exists', async () => {
      const bucket = { id: 'bucket-2' } as IStorageBucket;
      (storageBucketService.getStorageBucketParent as Mock).mockResolvedValue(
        null
      );

      const result = await resolver.parentEntity(bucket);

      expect(result).toBeNull();
    });
  });
});
