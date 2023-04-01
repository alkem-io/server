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
    private storageSpaceService: StorageSpaceService,
    @InjectRepository(StorageSpace)
    private storageRepository: Repository<StorageSpace>
  ) {}

  async applyAuthorizationPolicy(
    storageSpace: IStorageSpace,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IStorageSpace> {
    // Ensure always applying from a clean state
    storageSpace.authorization = this.authorizationPolicyService.reset(
      storageSpace.authorization
    );
    storageSpace.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storageSpace.authorization,
        parentAuthorization
      );

    // Cascade down
    const storagePropagated = await this.propagateAuthorizationToChildEntities(
      storageSpace
    );

    return await this.storageRepository.save(storagePropagated);
  }

  private async propagateAuthorizationToChildEntities(
    storageSpace: IStorageSpace
  ): Promise<IStorageSpace> {
    storageSpace.documents = await this.storageSpaceService.getDocuments(
      storageSpace
    );
    for (const document of storageSpace.documents) {
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageSpace.authorization
      );
    }

    return storageSpace;
  }
}
