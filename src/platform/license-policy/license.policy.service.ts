import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ILicensePolicy } from './license.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ILicenseFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { ILicensePolicyRuleFeatureFlag } from '@core/license-engine/license.policy.rule.feature.flag.interface';
import { LicensePolicy } from './license.policy.entity';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class LicensePolicyService {
  constructor(
    @InjectRepository(LicensePolicy)
    private licensePolicyRepository: Repository<LicensePolicy>,
    private licenseEngineService: LicenseEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createFeatureFlagRule(
    grantedPrivileges: LicensePrivilege[],
    featureFlag: ILicenseFeatureFlag,
    name: string
  ): ILicensePolicyRuleFeatureFlag {
    return {
      grantedPrivileges,
      featureFlag,
      name,
    };
  }

  reset(licensePolicy: ILicensePolicy | undefined): ILicensePolicy {
    if (!licensePolicy) {
      throw new RelationshipNotFoundException(
        'Undefined License Policy supplied',
        LogContext.LICENSE
      );
    }
    licensePolicy.featureFlagRules = '';
    return licensePolicy;
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

  cloneLicensePolicy(
    originalLicense: ILicensePolicy | undefined
  ): ILicensePolicy {
    this.validateLicense(originalLicense);
    const clonedLicense: ILicensePolicy = JSON.parse(
      JSON.stringify(originalLicense)
    );
    return clonedLicense;
  }

  validateLicense(license: ILicensePolicy | undefined): ILicensePolicy {
    if (!license)
      throw new ForbiddenException(
        'License: no definition provided',
        LogContext.LICENSE
      );
    return license;
  }

  getFeatureFlagRules(
    license: ILicensePolicy
  ): ILicensePolicyRuleFeatureFlag[] {
    const rules = this.licenseEngineService.convertFeatureFlagRulesStr(
      license.featureFlagRules
    );
    return rules;
  }
}
