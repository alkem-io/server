import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { StorageBucketAuthorizationService } from '../storage-bucket/storage.bucket.service.authorization';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';

@Injectable()
export class StorageAggregatorAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    storageAggregatorInput: IStorageAggregator,
    parentAuthorization: IAuthorizationPolicy | undefined,
    additionalCredentialRules: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
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
    // Additional rules supplied by the parent entity (e.g. a Space granting
    // members FILE_UPLOAD on its storage when members can create callouts).
    // These must cascade to reach the directStorage bucket below.
    if (additionalCredentialRules.length > 0) {
      storageAggregator.authorization =
        this.authorizationPolicyService.appendCredentialAuthorizationRules(
          storageAggregator.authorization,
          additionalCredentialRules
        );
    }
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
