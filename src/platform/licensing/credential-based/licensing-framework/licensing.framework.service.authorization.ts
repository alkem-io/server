import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicensingFrameworkService } from './licensing.framework.service';
import { ILicensingFramework } from './licensing.framework.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { LicensePolicyAuthorizationService } from '@platform/licensing/credential-based/license-policy/license.policy.service.authorization';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_LICENSE_MANAGER } from '@common/constants/authorization/credential.rule.constants';

@Injectable()
export class LicensingFrameworkAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licensePolicyAuthorizationService: LicensePolicyAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    licensingInput: ILicensingFramework,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    let licensing = licensingInput;
    if (!licensing.licensePolicy) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        licensingInput.id,
        {
          relations: {
            licensePolicy: true,
          },
        }
      );
    }

    if (!licensing.licensePolicy) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for license manager auth: ${licensing.id} `,
        LogContext.LICENSE
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    licensing.authorization = this.authorizationPolicyService.reset(
      licensing.authorization
    );
    licensing.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licensing.authorization,
        parentAuthorization
      );
    licensing.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousReadAccess(
        licensing.authorization
      );
    licensing.authorization = await this.appendCredentialRules(
      licensing.authorization
    );
    updatedAuthorizations.push(licensing.authorization);

    // Cascade down
    const policyAuthorization =
      this.licensePolicyAuthorizationService.applyAuthorizationPolicy(
        licensing.licensePolicy,
        licensing.authorization
      );
    updatedAuthorizations.push(policyAuthorization);

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for license manager',
        LogContext.LICENSE
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const licensings =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        [AuthorizationCredential.GLOBAL_LICENSE_MANAGER],
        CREDENTIAL_RULE_LICENSE_MANAGER
      );
    licensings.cascade = true;
    newRules.push(licensings);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
