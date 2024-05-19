import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseManagerService } from './license.manager.service';
import { ILicenseManager } from './license.manager.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LicensePolicyAuthorizationService } from '@platform/license-policy/license.policy.service.authorization';

@Injectable()
export class LicenseManagerAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private licenseManagerService: LicenseManagerService,
    private licensePolicyAuthorizationService: LicensePolicyAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    licenseManagerInput: ILicenseManager,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILicenseManager> {
    let licenseManager = licenseManagerInput;
    if (!licenseManager.licensePolicy) {
      licenseManager = await this.licenseManagerService.getLicenseManagerOrFail(
        licenseManagerInput.id,
        {
          relations: {
            licensePolicy: true,
          },
        }
      );
    }

    if (!licenseManager.licensePolicy)
      throw new RelationshipNotFoundException(
        `Unable to load entities for license manager auth: ${licenseManager.id} `,
        LogContext.LICENSE
      );
    // Ensure always applying from a clean state
    licenseManager.authorization = this.authorizationPolicyService.reset(
      licenseManager.authorization
    );
    licenseManager.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licenseManager.authorization,
        parentAuthorization
      );

    // Cascade down
    licenseManager.licensePolicy =
      await this.licensePolicyAuthorizationService.applyAuthorizationPolicy(
        licenseManager.licensePolicy,
        licenseManager.authorization
      );

    return await this.licenseManagerService.save(licenseManager);
  }
}
