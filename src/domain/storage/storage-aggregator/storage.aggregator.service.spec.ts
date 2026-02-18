import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import {
  EntityNotInitializedException,
  NotSupportedException,
} from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { StorageBucketService } from '../storage-bucket/storage.bucket.service';
import { StorageAggregator } from './storage.aggregator.entity';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';

describe('StorageAggregatorService', () => {
  let service: StorageAggregatorService;
  let storageAggregatorRepository: Repository<StorageAggregator>;
  let storageBucketService: StorageBucketService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let storageAggregatorResolverService: StorageAggregatorResolverService;
  let urlGeneratorService: UrlGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorService,
        repositoryProviderMockFactory(StorageAggregator),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageAggregatorService>(StorageAggregatorService);
    storageAggregatorRepository = module.get<Repository<StorageAggregator>>(
      getRepositoryToken(StorageAggregator)
    );
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    storageAggregatorResolverService =
      module.get<StorageAggregatorResolverService>(
        StorageAggregatorResolverService
      );
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
  });

  // ── createStorageAggregator ─────────────────────────────────────

  describe('createStorageAggregator', () => {
    it('should create a storage aggregator with direct storage bucket and authorization policy when valid type given', async () => {
      const mockBucket = { id: 'bucket-1', documents: [] };
      (storageBucketService.createStorageBucket as Mock).mockReturnValue(
        mockBucket
      );
      (storageBucketService.save as Mock).mockResolvedValue(mockBucket);
      (storageAggregatorRepository.save as Mock).mockImplementation(
        async (entity: any) => ({ ...entity, id: 'agg-1' })
      );

      const result = await service.createStorageAggregator(
        StorageAggregatorType.SPACE
      );

      expect(result.type).toBe(StorageAggregatorType.SPACE);
      expect(result.authorization).toBeDefined();
      expect(result.directStorage).toBe(mockBucket);
      expect(storageBucketService.createStorageBucket).toHaveBeenCalledWith({});
      expect(storageBucketService.save).toHaveBeenCalledWith(mockBucket);
      expect(storageAggregatorRepository.save).toHaveBeenCalled();
    });

    it('should link parent storage aggregator when one is provided', async () => {
      const parentAggregator = {
        id: 'parent-agg',
        type: StorageAggregatorType.PLATFORM,
      } as IStorageAggregator;
      const mockBucket = { id: 'bucket-2' };
      (storageBucketService.createStorageBucket as Mock).mockReturnValue(
        mockBucket
      );
      (storageBucketService.save as Mock).mockResolvedValue(mockBucket);
      (storageAggregatorRepository.save as Mock).mockImplementation(
        async (entity: any) => ({ ...entity, id: 'agg-2' })
      );

      const result = await service.createStorageAggregator(
        StorageAggregatorType.ACCOUNT,
        parentAggregator
      );

      expect(result.parentStorageAggregator).toBe(parentAggregator);
    });

    it('should leave parentStorageAggregator undefined when no parent is provided', async () => {
      const mockBucket = { id: 'bucket-3' };
      (storageBucketService.createStorageBucket as Mock).mockReturnValue(
        mockBucket
      );
      (storageBucketService.save as Mock).mockResolvedValue(mockBucket);
      (storageAggregatorRepository.save as Mock).mockImplementation(
        async (entity: any) => ({ ...entity, id: 'agg-3' })
      );

      const result = await service.createStorageAggregator(
        StorageAggregatorType.USER
      );

      expect(result.parentStorageAggregator).toBeUndefined();
    });
  });

  // ── delete ──────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete authorization policy, storage bucket, and remove aggregator when valid', async () => {
      const aggregator = {
        id: 'agg-1',
        authorization: { id: 'auth-1' },
        directStorage: { id: 'bucket-1' },
      };
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue(
        aggregator
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (storageBucketService.deleteStorageBucket as Mock).mockResolvedValue(
        undefined
      );
      (storageAggregatorRepository.remove as Mock).mockResolvedValue({
        ...aggregator,
        id: '',
      });

      const result = await service.delete('agg-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        aggregator.authorization
      );
      expect(storageBucketService.deleteStorageBucket).toHaveBeenCalledWith(
        'bucket-1'
      );
      expect(storageAggregatorRepository.remove).toHaveBeenCalled();
      expect(result.id).toBe('agg-1');
    });

    it('should throw EntityNotInitializedException when direct storage is missing', async () => {
      const aggregator = {
        id: 'agg-2',
        authorization: { id: 'auth-2' },
        directStorage: undefined,
      };
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue(
        aggregator
      );

      await expect(service.delete('agg-2')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should skip authorization deletion when aggregator has no authorization policy', async () => {
      const aggregator = {
        id: 'agg-3',
        authorization: undefined,
        directStorage: { id: 'bucket-3' },
      };
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue(
        aggregator
      );
      (storageBucketService.deleteStorageBucket as Mock).mockResolvedValue(
        undefined
      );
      (storageAggregatorRepository.remove as Mock).mockResolvedValue({
        ...aggregator,
        id: '',
      });

      await service.delete('agg-3');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(storageBucketService.deleteStorageBucket).toHaveBeenCalledWith(
        'bucket-3'
      );
    });
  });

  // ── getStorageAggregatorOrFail ──────────────────────────────────

  describe('getStorageAggregatorOrFail', () => {
    it('should return the aggregator when it exists', async () => {
      const aggregator = { id: 'agg-1', type: StorageAggregatorType.SPACE };
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue(
        aggregator
      );

      const result = await service.getStorageAggregatorOrFail('agg-1');

      expect(result).toBe(aggregator);
      expect(storageAggregatorRepository.findOneOrFail).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'agg-1' } })
      );
    });

    it('should pass through FindOneOptions when provided', async () => {
      const aggregator = { id: 'agg-1' };
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue(
        aggregator
      );

      await service.getStorageAggregatorOrFail('agg-1', {
        relations: { directStorage: true },
      });

      expect(storageAggregatorRepository.findOneOrFail).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'agg-1' },
          relations: { directStorage: true },
        })
      );
    });

    it('should propagate error when findOneOrFail rejects', async () => {
      (storageAggregatorRepository.findOneOrFail as Mock).mockRejectedValue(
        new Error('Entity not found')
      );

      await expect(
        service.getStorageAggregatorOrFail('non-existent')
      ).rejects.toThrow();
    });
  });

  // ── size ────────────────────────────────────────────────────────

  describe('size', () => {
    it('should sum direct storage, child bucket, and child aggregator sizes', async () => {
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      const directBucket = { id: 'bucket-1' };

      // getDirectStorageBucket: loads aggregator with directStorage
      (storageAggregatorRepository.findOneOrFail as Mock).mockImplementation(
        async (opts: any) => {
          if (opts.relations?.directStorage) {
            return { ...aggregator, directStorage: directBucket };
          }
          return aggregator;
        }
      );

      // direct storage size = 100
      (storageBucketService.size as Mock).mockImplementation(
        async (bucket: any) => {
          if (bucket.id === 'bucket-1') return 100;
          if (bucket.id === 'child-bucket-1') return 50;
          return 0;
        }
      );

      // child storage buckets
      (
        storageBucketService.getStorageBucketsForAggregator as Mock
      ).mockResolvedValue([{ id: 'child-bucket-1' }]);

      // no child aggregators
      (storageAggregatorRepository.find as Mock).mockResolvedValue([]);

      const result = await service.size(aggregator);

      // 100 (direct) + 50 (child bucket) + 0 (no child aggregators)
      expect(result).toBe(150);
    });

    it('should return zero when all storage components are empty', async () => {
      const aggregator = { id: 'agg-empty' } as IStorageAggregator;
      const directBucket = { id: 'bucket-empty' };

      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue({
        ...aggregator,
        directStorage: directBucket,
      });
      (storageBucketService.size as Mock).mockResolvedValue(0);
      (
        storageBucketService.getStorageBucketsForAggregator as Mock
      ).mockResolvedValue([]);
      (storageAggregatorRepository.find as Mock).mockResolvedValue([]);

      const result = await service.size(aggregator);

      expect(result).toBe(0);
    });
  });

  // ── getParentEntity ─────────────────────────────────────────────

  describe('getParentEntity', () => {
    it('should return space parent info when aggregator type is SPACE', async () => {
      const aggregator = {
        id: 'agg-space',
        type: StorageAggregatorType.SPACE,
      } as IStorageAggregator;
      const space = {
        id: 'space-1',
        level: 0,
        about: { profile: { displayName: 'My Space' } },
      };
      (
        storageAggregatorResolverService.getParentSpaceForStorageAggregator as Mock
      ).mockResolvedValue(space);
      (urlGeneratorService.getSpaceUrlPathByID as Mock).mockResolvedValue(
        '/spaces/space-1'
      );

      const result = await service.getParentEntity(aggregator);

      expect(result.id).toBe('space-1');
      expect(result.displayName).toBe('My Space');
      expect(result.url).toBe('/spaces/space-1');
      expect(result.level).toBe(0);
    });

    it('should return platform parent info when aggregator type is PLATFORM', async () => {
      const aggregator = {
        id: 'agg-platform',
        type: StorageAggregatorType.PLATFORM,
      } as IStorageAggregator;
      (urlGeneratorService.generateUrlForPlatform as Mock).mockReturnValue(
        '/platform'
      );

      const result = await service.getParentEntity(aggregator);

      expect(result.displayName).toBe('platform');
      expect(result.url).toBe('/platform');
    });

    it('should return organization parent info when aggregator type is ORGANIZATION', async () => {
      const aggregator = {
        id: 'agg-org',
        type: StorageAggregatorType.ORGANIZATION,
      } as IStorageAggregator;
      const org = {
        id: 'org-1',
        nameID: 'my-org',
        profile: { displayName: 'My Organization' },
      };
      (
        storageAggregatorResolverService.getParentOrganizationForStorageAggregator as Mock
      ).mockResolvedValue(org);
      (
        urlGeneratorService.createUrlForOrganizationNameID as Mock
      ).mockReturnValue('/organizations/my-org');

      const result = await service.getParentEntity(aggregator);

      expect(result.id).toBe('org-1');
      expect(result.displayName).toBe('My Organization');
      expect(result.url).toBe('/organizations/my-org');
    });

    it('should return user parent info when aggregator type is USER', async () => {
      const aggregator = {
        id: 'agg-user',
        type: StorageAggregatorType.USER,
      } as IStorageAggregator;
      const user = {
        id: 'user-1',
        nameID: 'john-doe',
        profile: { displayName: 'John Doe' },
      };
      (
        storageAggregatorResolverService.getParentUserForStorageAggregator as Mock
      ).mockResolvedValue(user);
      (urlGeneratorService.createUrlForUserNameID as Mock).mockReturnValue(
        '/users/john-doe'
      );

      const result = await service.getParentEntity(aggregator);

      expect(result.id).toBe('user-1');
      expect(result.displayName).toBe('John Doe');
      expect(result.url).toBe('/users/john-doe');
    });

    it('should return account parent info when aggregator type is ACCOUNT', async () => {
      const aggregator = {
        id: 'agg-account',
        type: StorageAggregatorType.ACCOUNT,
      } as IStorageAggregator;
      const account = { id: 'account-1' };
      (
        storageAggregatorResolverService.getParentAccountForStorageAggregator as Mock
      ).mockResolvedValue(account);
      (urlGeneratorService.generateUrlForPlatform as Mock).mockReturnValue(
        '/platform'
      );

      const result = await service.getParentEntity(aggregator);

      expect(result.id).toBe('account-1');
      expect(result.displayName).toBe('account');
      expect(result.url).toBe('/platform');
    });

    it('should throw NotSupportedException when aggregator type is unknown', async () => {
      const aggregator = {
        id: 'agg-unknown',
        type: 'unknown-type' as StorageAggregatorType,
      } as IStorageAggregator;

      await expect(service.getParentEntity(aggregator)).rejects.toThrow(
        NotSupportedException
      );
    });
  });

  // ── getDirectStorageBucket ──────────────────────────────────────

  describe('getDirectStorageBucket', () => {
    it('should return the direct storage bucket when it exists', async () => {
      const directBucket = { id: 'bucket-direct' };
      const aggregator = { id: 'agg-1' } as IStorageAggregator;
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue({
        ...aggregator,
        directStorage: directBucket,
      });

      const result = await service.getDirectStorageBucket(aggregator);

      expect(result).toEqual(directBucket);
    });

    it('should throw EntityNotFoundException when direct storage is missing', async () => {
      const aggregator = { id: 'agg-no-storage' } as IStorageAggregator;
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue({
        ...aggregator,
        directStorage: undefined,
      });

      await expect(service.getDirectStorageBucket(aggregator)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── getParentStorageAggregator ──────────────────────────────────

  describe('getParentStorageAggregator', () => {
    it('should return the parent aggregator when it exists', async () => {
      const parent = { id: 'parent-agg' };
      const aggregator = { id: 'child-agg' } as IStorageAggregator;
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue({
        ...aggregator,
        parentStorageAggregator: parent,
      });

      const result = await service.getParentStorageAggregator(aggregator);

      expect(result).toEqual(parent);
    });

    it('should return null when no parent aggregator exists', async () => {
      const aggregator = { id: 'root-agg' } as IStorageAggregator;
      (storageAggregatorRepository.findOneOrFail as Mock).mockResolvedValue({
        ...aggregator,
        parentStorageAggregator: undefined,
      });

      const result = await service.getParentStorageAggregator(aggregator);

      expect(result).toBeNull();
    });
  });

  // ── getChildStorageAggregators ──────────────────────────────────

  describe('getChildStorageAggregators', () => {
    it('should return child aggregators when they exist', async () => {
      const children = [{ id: 'child-1' }, { id: 'child-2' }];
      const aggregator = { id: 'parent-agg' } as IStorageAggregator;
      (storageAggregatorRepository.find as Mock).mockResolvedValue(children);

      const result = await service.getChildStorageAggregators(aggregator);

      expect(result).toEqual(children);
      expect(storageAggregatorRepository.find).toHaveBeenCalledWith({
        where: { parentStorageAggregator: { id: 'parent-agg' } },
      });
    });

    it('should return empty array when no children exist', async () => {
      const aggregator = { id: 'leaf-agg' } as IStorageAggregator;
      (storageAggregatorRepository.find as Mock).mockResolvedValue(null);

      const result = await service.getChildStorageAggregators(aggregator);

      expect(result).toEqual([]);
    });
  });
});
