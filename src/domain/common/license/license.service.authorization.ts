import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILicense } from './license.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

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

    license.authorization.credentialRules.push(...credentialRulesFromParent);
    updatedAuthorizations.push(license.authorization);

    return updatedAuthorizations;
  }
}
