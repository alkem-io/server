import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ILibrary } from './library.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { LibraryService } from './library.service';

Injectable();
export class LibraryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private libraryService: LibraryService
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
    // For now the library is world visible
    library.authorization.anonymousReadAccess = true;

    return await this.libraryService.save(library);
  }
}
