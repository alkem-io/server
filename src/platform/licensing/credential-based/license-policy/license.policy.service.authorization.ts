import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { ILicensePolicy } from './license.policy.interface';

@Injectable()
export class LicensePolicyAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    licensePolicy: ILicensePolicy,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    licensePolicy.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        licensePolicy.authorization,
        parentAuthorization
      );

    return licensePolicy.authorization;
  }
}
