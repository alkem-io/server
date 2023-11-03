import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ILicense } from './license.interface';
import { License } from './license.entity';
import { LicenseService } from './license.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class LicenseAuthorizationService {
  constructor(
    private licenseService: LicenseService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>
  ) {}

  async applyAuthorizationPolicy(
    licenseInput: ILicense,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILicense> {
    const license = await this.licenseService.getLicenseOrFail(licenseInput.id);

    license.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        license.authorization,
        parentAuthorization
      );

    return await this.licenseRepository.save(license);
  }
}
