import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucket } from './storage.bucket.entity';
import { StorageBucketService } from './storage.bucket.service';
import { IStorageBucket } from './storage.bucket.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { DocumentAuthorizationService } from '../document/document.service.authorization';

@Injectable()
export class StorageBucketAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private storageBucketService: StorageBucketService,
    @InjectRepository(StorageBucket)
    private storageRepository: Repository<StorageBucket>
  ) {}

  async applyAuthorizationPolicy(
    storageBucket: IStorageBucket,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IStorageBucket> {
    // Ensure always applying from a clean state
    storageBucket.authorization = this.authorizationPolicyService.reset(
      storageBucket.authorization
    );
    storageBucket.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storageBucket.authorization,
        parentAuthorization
      );

    // Cascade down
    const storagePropagated = await this.propagateAuthorizationToChildEntities(
      storageBucket
    );

    return await this.storageRepository.save(storagePropagated);
  }

  private async propagateAuthorizationToChildEntities(
    storageBucket: IStorageBucket
  ): Promise<IStorageBucket> {
    storageBucket.documents = await this.storageBucketService.getDocuments(
      storageBucket
    );
    for (const document of storageBucket.documents) {
      document.authorization = (
        await this.documentAuthorizationService.applyAuthorizationPolicy(
          document,
          storageBucket.authorization
        )
      ).authorization;
    }

    return storageBucket;
  }
}
