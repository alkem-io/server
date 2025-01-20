import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILicense } from './license.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { POLICY_RULE_READ_ABOUT } from '@common/constants/authorization/policy.rule.constants';
import { AuthorizationPrivilege } from '@common/enums';

@Injectable()
export class LicenseAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    license: ILicense,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): IAuthorizationPolicy[] {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    license.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        license.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(license.authorization);

    // If can READ_ABOUT on Context, then also allow general READ
    license.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        license.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        [AuthorizationPrivilege.READ],
        POLICY_RULE_READ_ABOUT
      );
    license.authorization.credentialRules.push(...credentialRulesFromParent);
    updatedAuthorizations.push(license.authorization);

    return updatedAuthorizations;
  }
}
