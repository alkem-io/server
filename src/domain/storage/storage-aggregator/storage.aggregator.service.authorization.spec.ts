import { AuthorizationPrivilege } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { StorageBucketAuthorizationService } from '../storage-bucket/storage.bucket.service.authorization';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';
import { StorageAggregatorAuthorizationService } from './storage.aggregator.service.authorization';

describe('StorageAggregatorAuthorizationService', () => {
  let service: StorageAggregatorAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let storageAggregatorService: StorageAggregatorService;
  let storageBucketAuthorizationService: StorageBucketAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageAggregatorAuthorizationService>(
      StorageAggregatorAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    storageAggregatorService = module.get<StorageAggregatorService>(
      StorageAggregatorService
    );
    storageBucketAuthorizationService =
      module.get<StorageBucketAuthorizationService>(
        StorageBucketAuthorizationService
      );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset, inherit, add anonymous access, and cascade to bucket when aggregator is valid', async () => {
      const parentAuth = { id: 'parent-auth' };
      const aggAuth = { id: 'agg-auth' };
      const directStorage = { id: 'bucket-1', documents: [] };
      const aggregatorInput = { id: 'agg-1' } as IStorageAggregator;

      const loadedAggregator = {
        id: 'agg-1',
        authorization: aggAuth,
        directStorage,
      };

      (
        storageAggregatorService.getStorageAggregatorOrFail as Mock
      ).mockResolvedValue(loadedAggregator);

      const resetAuth = { id: 'reset-auth' };
      const inheritedAuth = { id: 'inherited-auth' };
      const anonAuth = { id: 'anon-auth' };
      (authorizationPolicyService.reset as Mock).mockReturnValue(resetAuth);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(inheritedAuth);
      (
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess as Mock
      ).mockReturnValue(anonAuth);

      const bucketAuths = [{ id: 'bucket-auth-1' }];
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue(bucketAuths);

      const result = await service.applyAuthorizationPolicy(
        aggregatorInput,
        parentAuth as any
      );

      expect(
        storageAggregatorService.getStorageAggregatorOrFail
      ).toHaveBeenCalledWith('agg-1', {
        relations: {
          directStorage: { documents: { tagset: true } },
          authorization: true,
        },
      });
      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(aggAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).toHaveBeenCalledWith(inheritedAuth, AuthorizationPrivilege.READ);
      expect(
        storageBucketAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(directStorage, anonAuth);
      expect(result).toEqual(
        expect.arrayContaining([anonAuth, { id: 'bucket-auth-1' }])
      );
    });

    it('should throw RelationshipNotFoundException when directStorage is missing', async () => {
      const aggregatorInput = { id: 'agg-2' } as IStorageAggregator;
      (
        storageAggregatorService.getStorageAggregatorOrFail as Mock
      ).mockResolvedValue({
        id: 'agg-2',
        authorization: { id: 'auth-2' },
        directStorage: undefined,
      });

      await expect(
        service.applyAuthorizationPolicy(aggregatorInput, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const aggregatorInput = { id: 'agg-3' } as IStorageAggregator;
      (
        storageAggregatorService.getStorageAggregatorOrFail as Mock
      ).mockResolvedValue({
        id: 'agg-3',
        authorization: undefined,
        directStorage: { id: 'bucket-3' },
      });

      await expect(
        service.applyAuthorizationPolicy(aggregatorInput, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
