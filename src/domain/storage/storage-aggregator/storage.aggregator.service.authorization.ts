import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { storageAggregators } from './storage.aggregator.schema';
import { StorageBucketAuthorizationService } from '../storage-bucket/storage.bucket.service.authorization';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class StorageAggregatorAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  async applyAuthorizationPolicy(
    storageAggregatorInput: IStorageAggregator,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const storageAggregator =
      await this.storageAggregatorService.getStorageAggregatorOrFail(
        storageAggregatorInput.id,
        {
          relations: {
            authorization: true,
            directStorage: {
              authorization: true,
              documents: {
                authorization: true,
                tagset: { authorization: true },
              },
            },
          },
        },
      });
    if (!storageAggregatorRow) {
      throw new EntityNotFoundException(
        'StorageAggregator not found',
        LogContext.STORAGE_BUCKET
      );
    }
    const storageAggregator =
      storageAggregatorRow as unknown as IStorageAggregator;
    if (!storageAggregator.directStorage || !storageAggregator.authorization)
      throw new RelationshipNotFoundException(
        `Unable to load entities on StorageAggregator: ${storageAggregator.id} `,
        LogContext.STORAGE_BUCKET
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    storageAggregator.authorization = this.authorizationPolicyService.reset(
      storageAggregator.authorization
    );
    storageAggregator.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storageAggregator.authorization,
        parentAuthorization
      );
    storageAggregator.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        storageAggregator.authorization,
        AuthorizationPrivilege.READ
      );
    updatedAuthorizations.push(storageAggregator.authorization);

    const bucketAuthorizations =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        storageAggregator.directStorage,
        storageAggregator.authorization
      );
    updatedAuthorizations.push(...bucketAuthorizations);

    return updatedAuthorizations;
  }
}
