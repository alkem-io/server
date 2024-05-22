import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ILicensePolicy } from './license.policy.interface';

@Injectable()
export class LicensePolicyAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    licensePolicy: ILicensePolicy,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): ILicensePolicy {
    licensePolicy.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licensePolicy.authorization,
        parentAuthorization
      );

    return licensePolicy;
  }
}
