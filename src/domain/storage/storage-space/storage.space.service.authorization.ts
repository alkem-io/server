import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageSpace } from './storage.space.entity';
import { StorageSpaceService } from './storage.space.service';
import { IStorageSpace } from './storage.space.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { DocumentAuthorizationService } from '../document/document.service.authorization';

@Injectable()
export class StorageSpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private storage: StorageSpaceService,
    @InjectRepository(StorageSpace)
    private storageRepository: Repository<StorageSpace>
  ) {}

  async applyAuthorizationPolicy(
    storage: IStorageSpace,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IStorageSpace> {
    // Ensure always applying from a clean state
    storage.authorization = this.authorizationPolicyService.reset(
      storage.authorization
    );
    storage.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storage.authorization,
        parentAuthorization
      );

    // Cascade down
    const storagePropagated = await this.propagateAuthorizationToChildEntities(
      storage
    );

    return await this.storageRepository.save(storagePropagated);
  }

  private async propagateAuthorizationToChildEntities(
    storage: IStorageSpace
  ): Promise<IStorageSpace> {
    storage.documents = await this.storage.getDocuments(storage);
    for (const document of storage.documents) {
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storage.authorization
      );
    }

    return storage;
  }
}
