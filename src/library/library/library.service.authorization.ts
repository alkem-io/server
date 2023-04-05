import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Library } from './library.entity';
import { LibraryService } from './library.service';
import { ILibrary } from './library.interface';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { StorageSpaceAuthorizationService } from '@domain/storage/storage-space/storage.space.service.authorization';

@Injectable()
export class LibraryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private storageSpaceAuthorizationService: StorageSpaceAuthorizationService,
    private libraryService: LibraryService,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>
  ) {}

  async applyAuthorizationPolicy(
    library: ILibrary,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILibrary> {
    // Ensure always applying from a clean state
    library.authorization = this.authorizationPolicyService.reset(
      library.authorization
    );
    library.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        library.authorization,
        parentAuthorization
      );

    // Cascade down
    const libraryPropagated = await this.propagateAuthorizationToChildEntities(
      library
    );

    return await this.libraryRepository.save(libraryPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    library: ILibrary
  ): Promise<ILibrary> {
    library.innovationPacks = await this.libraryService.getInnovationPacks(
      library
    );
    for (const innovationPack of library.innovationPacks) {
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        innovationPack,
        library.authorization
      );
    }

    library.storageSpace = await this.libraryService.getStorageSpace(library);
    library.storageSpace =
      await this.storageSpaceAuthorizationService.applyAuthorizationPolicy(
        library.storageSpace,
        library.authorization
      );

    return library;
  }
}
