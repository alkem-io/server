import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicensePolicyService } from './license.policy.service';
import { ILicensePolicy } from './license.policy.interface';
import { LicensePolicy } from './license.policy.entity';

@Injectable()
export class LicensePolicyAuthorizationService {
  constructor(
    private licensePolicyService: LicensePolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(LicensePolicy)
    private licensePolicyRepository: Repository<LicensePolicy>
  ) {}

  async applyAuthorizationPolicy(
    licensePolicyInput: ILicensePolicy,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILicensePolicy> {
    const licensePolicy =
      await this.licensePolicyService.getLicensePolicyOrFail(
        licensePolicyInput.id
      );

    licensePolicy.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licensePolicy.authorization,
        parentAuthorization
      );

    return await this.licensePolicyRepository.save(licensePolicy);
  }
}
