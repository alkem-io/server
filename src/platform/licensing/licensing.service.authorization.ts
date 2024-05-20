import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicensingService } from './licensing.service';
import { ILicensing } from './licensing.interface';
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
import { LicensePolicyAuthorizationService } from '@platform/license-policy/license.policy.service.authorization';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_LICENSE_MANAGER } from '@common/constants/authorization/credential.rule.constants';

@Injectable()
export class LicensingAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private licensingService: LicensingService,
    private licensePolicyAuthorizationService: LicensePolicyAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    licensingInput: ILicensing,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILicensing> {
    let licensing = licensingInput;
    if (!licensing.licensePolicy) {
      licensing = await this.licensingService.getLicensingOrFail(
        licensingInput.id,
        {
          relations: {
            licensePolicy: true,
          },
        }
      );
    }

    if (!licensing.licensePolicy)
      throw new RelationshipNotFoundException(
        `Unable to load entities for license manager auth: ${licensing.id} `,
        LogContext.LICENSE
      );
    // Ensure always applying from a clean state
    licensing.authorization = this.authorizationPolicyService.reset(
      licensing.authorization
    );
    licensing.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licensing.authorization,
        parentAuthorization
      );
    licensing.authorization.anonymousReadAccess = true;
    licensing.authorization = await this.appendCredentialRules(
      licensing.authorization
    );

    // Cascade down
    licensing.licensePolicy =
      await this.licensePolicyAuthorizationService.applyAuthorizationPolicy(
        licensing.licensePolicy,
        licensing.authorization
      );

    return await this.licensingService.save(licensing);
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
