import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';
import { ForbiddenLicensePolicyException } from '@common/exceptions/forbidden.license.policy.exception';
import { ILicenseFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { ILicensePolicyRuleFeatureFlag } from './license.policy.rule.feature.flag.interface';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LicensePolicy } from '@platform/license-policy';
import { ILicense } from '@domain/license/license/license.interface';
import { License } from '@domain/license/license/license.entity';

@Injectable()
export class LicenseEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async grantAccessOrFail(
    privilegeRequired: LicensePrivilege,
    license: ILicense,
    msg: string,
    licensePolicy: ILicensePolicy | undefined
  ) {
    const accessGranted = await this.isAccessGranted(
      privilegeRequired,
      license,
      licensePolicy
    );
    if (accessGranted) return true;

    const errorMsg = `License.engine: unable to grant '${privilegeRequired}' privilege: ${msg} license: ${license.id}`;
    // If you get to here then no match was found
    throw new ForbiddenLicensePolicyException(
      errorMsg,
      privilegeRequired,
      licensePolicy?.id || 'no license policy',
      license.id
    );
  }

  public async isAccessGranted(
    privilegeRequired: LicensePrivilege,
    license: ILicense,
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<boolean> {
    const policy = await this.getLicensePolicyOrFail(licensePolicy);
    const featureFlags = await this.getLicenseFeatureFlags(license);

    const featureFlagRules = this.convertFeatureFlagRulesStr(
      policy.featureFlagRules
    );
    for (const rule of featureFlagRules) {
      for (const featureFlag of featureFlags) {
        if (featureFlag.name === rule.featureFlagName) {
          if (featureFlag.enabled) {
            if (rule.grantedPrivileges.includes(privilegeRequired)) {
              this.logger.verbose?.(
                `[FeatureFlagRule] Granted privilege '${privilegeRequired}' using rule '${rule.name}'`,
                LogContext.LICENSE
              );
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private async getLicensePolicyOrFail(
    licensePolicy?: ILicensePolicy | undefined
  ): Promise<ILicensePolicy> {
    let policy = licensePolicy;
    if (!policy) {
      policy = await this.getDefaultLicensePollicyOrFail();
    }
    return policy;
  }

  public async getGrantedPrivileges(
    license: ILicense,
    licensePolicy?: ILicensePolicy
  ) {
    const policy = await this.getLicensePolicyOrFail(licensePolicy);
    const featureFlags = await this.getLicenseFeatureFlags(license);

    const grantedPrivileges: LicensePrivilege[] = [];

    const featureFlagRules = this.convertFeatureFlagRulesStr(
      policy.featureFlagRules
    );
    for (const rule of featureFlagRules) {
      for (const featureFlag of featureFlags) {
        if (rule.featureFlagName === featureFlag.name && featureFlag.enabled) {
          for (const privilege of rule.grantedPrivileges) {
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const uniquePrivileges = grantedPrivileges.filter(
      (item, i, ar) => ar.indexOf(item) === i
    );

    return uniquePrivileges;
  }

  convertFeatureFlagRulesStr(
    rulesStr: string
  ): ILicensePolicyRuleFeatureFlag[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      return JSON.parse(rulesStr);
    } catch (error: any) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg, error?.stack, LogContext.AUTH);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  // TODO: a work around, need to look at how to make the license policy more readily available
  // in all contexts
  private async getDefaultLicensePollicyOrFail(): Promise<ILicensePolicy> {
    let licensePolicy: ILicensePolicy | null = null;
    licensePolicy = (
      await this.entityManager.find(LicensePolicy, { take: 1 })
    )?.[0];

    if (!licensePolicy) {
      throw new EntityNotFoundException(
        'Unable to find default License Policy',
        LogContext.LICENSE
      );
    }
    return licensePolicy;
  }

  private async getLicenseFeatureFlags(
    licenseInput: ILicense
  ): Promise<ILicenseFeatureFlag[]> {
    // If already loaded do nothing
    if (licenseInput.featureFlags) {
      return licenseInput?.featureFlags;
    }
    let license: ILicense | null = null;
    license = await this.entityManager.findOne(License, {
      where: { id: licenseInput.id },
      relations: {
        featureFlags: true,
      },
    });

    if (!license || !license.featureFlags) {
      throw new EntityNotFoundException(
        'Unable to find load features flags on License',
        LogContext.LICENSE
      );
    }
    return license.featureFlags;
  }
}
