import { Injectable } from '@nestjs/common';
import { ILicense } from './license.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class LicenseAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    license: ILicense,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): ILicense {
    license.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        license.authorization,
        parentAuthorization
      );

    return license;
  }
}
