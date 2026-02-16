import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { ILibrary } from './library.interface';
import { LibraryService } from './library.service';

@Injectable()
export class LibraryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private libraryService: LibraryService
  ) {}

  async applyAuthorizationPolicy(
    libraryInput: ILibrary,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    const library = libraryInput.authorization
      ? libraryInput
      : await this.libraryService.getLibraryOrFail({
          with: { authorization: true },
        });
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
    library.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        library.authorization,
        AuthorizationPrivilege.READ
      );

    return library.authorization;
  }
}
