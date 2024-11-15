import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ILicense } from './license.interface';

@Injectable()
export class LicenseAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    license: ILicense,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy[] {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    license.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        license.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(license.authorization);

    return updatedAuthorizations;
  }
}
