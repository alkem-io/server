import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Library } from './library.entity';
import { LibraryService } from './library.service';
import { ILibrary } from './library.interface';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotInitializedException } from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_TYPES_LIBRARY_FILE_UPLOAD_ANY_USER } from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';

@Injectable()
export class LibraryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
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

    library.storageAggregator = await this.libraryService.getStorageAggregator(
      library
    );
    library.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        library.storageAggregator,
        library.authorization
      );
    library.storageAggregator.authorization =
      this.extendStorageAuthorizationPolicy(
        library.storageAggregator.authorization,
        library
      );

    return library;
  }

  private extendStorageAuthorizationPolicy(
    storageAuthorization: IAuthorizationPolicy | undefined,
    library: ILibrary
  ): IAuthorizationPolicy {
    if (!storageAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${library.id}`,
        LogContext.LIBRARY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Any member can upload
    const registeredUsersCanUpload =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.FILE_UPLOAD],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_LIBRARY_FILE_UPLOAD_ANY_USER
      );
    registeredUsersCanUpload.cascade = false;
    newRules.push(registeredUsersCanUpload);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      storageAuthorization,
      newRules
    );

    return storageAuthorization;
  }
}
