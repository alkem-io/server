import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { Injectable } from '@nestjs/common';
import { ILibrary } from './library.interface';

@Injectable()
export class LibraryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService
  ) {}

  async applyAuthorizationPolicy(
    library: ILibrary,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
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

    await this.inheritedCredentialRuleSetService.resolveForParent(
      library.authorization
    );

    return library.authorization;
  }
}
