import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { ILicensePolicy } from './license.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensePolicy } from './license.policy.entity';
import { LicensingCredentialBasedService } from '@core/licensing-credential-based/licensing.credential.based.service';
import { LogContext } from '@common/enums/logging.context';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@core/licensing-credential-based';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credental.based.credential.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

@Injectable()
export class LicensePolicyService {
  constructor(
    @InjectRepository(LicensePolicy)
    private licensePolicyRepository: Repository<LicensePolicy>,
    private licenseEngineService: LicensingCredentialBasedService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createCredentialRule(
    grantedEntitlements: LicenseEntitlementType[],
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

  getCredentialRules(
    license: ILicensePolicy
  ): ILicensingCredentialBasedPolicyCredentialRule[] {
    const rules = this.licenseEngineService.convertCredentialRulesStr(
      license.credentialRulesStr
    );
    return rules;
  }
}
