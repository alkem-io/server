import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageAggregatorService } from './storage.aggregator.service';
import { IStorageAggregator } from './storage.aggregator.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { LogContext } from '@common/enums';
import { StorageBucketAuthorizationService } from '../storage-bucket/storage.bucket.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class StorageAggregatorAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    storageAggregatorInput: IStorageAggregator,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IStorageAggregator> {
    const storageAggregator =
      await this.storageAggregatorService.getStorageAggregatorOrFail(
        storageAggregatorInput.id,
        {
          relations: {
            directStorage: {
              documents: {
                tagset: true,
              },
            },
            authorization: true,
          },
        }
      );
    if (!storageAggregator.directStorage || !storageAggregator.authorization)
      throw new RelationshipNotFoundException(
        `Unable to load entities on StorageAggregator: ${storageAggregator.id} `,
        LogContext.STORAGE_BUCKET
      );

    storageAggregator.authorization = this.authorizationPolicyService.reset(
      storageAggregator.authorization
    );
    storageAggregator.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storageAggregator.authorization,
        parentAuthorization
      );

    storageAggregator.directStorage =
      this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        storageAggregator.directStorage,
        storageAggregator.authorization
      );

    return storageAggregator;
  }
}
