import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { ILicensePolicy } from './license.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensePolicy } from './license.policy.entity';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ILicensePolicyCredentialRule } from '@core/license-engine';
import { LicenseCredential } from '@common/enums/license.credential';

@Injectable()
export class LicensePolicyService {
  constructor(
    @InjectRepository(LicensePolicy)
    private licensePolicyRepository: Repository<LicensePolicy>,
    private licenseEngineService: LicenseEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createCredentialRule(
    grantedPrivileges: LicensePrivilege[],
    credentialType: LicenseCredential,
    name: string
  ): ILicensePolicyCredentialRule {
    return {
      grantedPrivileges,
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

  getCredentialRules(license: ILicensePolicy): ILicensePolicyCredentialRule[] {
    const rules = this.licenseEngineService.convertCredentialRulesStr(
      license.credentialRulesStr
    );
    return rules;
  }
}
