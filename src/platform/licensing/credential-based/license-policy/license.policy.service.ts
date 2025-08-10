import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { ILicensePolicy } from './license.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensePolicy } from './license.policy.entity';
import { LogContext } from '@common/enums/logging.context';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';

@Injectable()
export class LicensePolicyService {
  constructor(
    @InjectRepository(LicensePolicy)
    private licensePolicyRepository: Repository<LicensePolicy>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createCredentialRule(
    grantedEntitlements: LicensingGrantedEntitlement[],
    credentialType: LicensingCredentialBasedCredentialType,
    name: string
  ): ILicensingCredentialBasedPolicyCredentialRule {
    return {
      grantedEntitlements: grantedEntitlements,
      credentialType,
      name,
    };
  }

  async getLicensePolicyOrFail(
    licensePolicyID: string
  ): Promise<ILicensePolicy> {
    const licensePolicy = await this.licensePolicyRepository.findOneBy({
      id: licensePolicyID,
    });
    if (!licensePolicy)
      throw new EntityNotFoundException(
        `Not able to locate License Policy with the specified ID: ${licensePolicyID}`,
        LogContext.LICENSE
      );
    return licensePolicy;
  }

  async delete(licensePolicy: ILicensePolicy): Promise<ILicensePolicy> {
    return await this.licensePolicyRepository.remove(
      licensePolicy as LicensePolicy
    );
  }

  async save(licensePolicy: ILicensePolicy): Promise<ILicensePolicy> {
    return await this.licensePolicyRepository.save(licensePolicy);
  }
}
