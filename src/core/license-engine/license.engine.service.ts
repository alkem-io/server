import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';
import { ILicense } from '@domain/license/license/license.interface';
import { ForbiddenLicensePolicyException } from '@common/exceptions/forbidden.license.policy.exception';
import { ILicenseFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { ILicensePolicyRuleFeatureFlag } from './license.policy.rule.feature.flag.interface';

@Injectable()
export class LicenseEngineService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  grantAccessOrFail(
    licensePolicy: ILicensePolicy | undefined,
    privilegeRequired: LicensePrivilege,
    license: ILicense,
    licenseFeatureFlags: ILicenseFeatureFlag[],
    msg: string
  ) {
    if (!licensePolicy) {
      throw new ForbiddenException(
        'License.engine: no definition provided',
        LogContext.LICENSE
      );
    }

    if (
      this.isAccessGranted(
        licensePolicy,
        licenseFeatureFlags,
        privilegeRequired
      )
    )
      return true;

    const errorMsg = `License.engine: unable to grant '${privilegeRequired}' privilege: ${msg} featureFlags: ${license.id}`;
    // If you get to here then no match was found
    throw new ForbiddenLicensePolicyException(
      errorMsg,
      privilegeRequired,
      licensePolicy.id,
      license.id
    );
  }

  isAccessGranted(
    licensePolicy: ILicensePolicy | undefined,
    licenseFeatureFlags: ILicenseFeatureFlag[],
    privilegeRequired: LicensePrivilege
  ): boolean {
    if (!licensePolicy) {
      throw new ForbiddenException(
        'License.engine: no definition provided',
        LogContext.LICENSE
      );
    }

    const featureFlagRules = this.convertFeatureFlagRulesStr(
      licensePolicy.featureFlagRules
    );
    for (const rule of featureFlagRules) {
      for (const featureFlag of licenseFeatureFlags) {
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

  getGrantedPrivileges(
    licenseFeatureFlags: ILicenseFeatureFlag[],
    licensePolicy: ILicensePolicy
  ) {
    const grantedPrivileges: LicensePrivilege[] = [];

    const featureFlagRules = this.convertFeatureFlagRulesStr(
      licensePolicy.featureFlagRules
    );
    const featureFlags = licenseFeatureFlags;
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
}
