import { ILicensePolicyRuleFeatureFlag } from './license.policy.rule.feature.flag.interface';
import { ILicenseFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { LicensePrivilege } from '@common/enums/license.privilege';

export class LicensePolicyRuleFeatureFlag
  implements ILicensePolicyRuleFeatureFlag
{
  featureFlag: ILicenseFeatureFlag;
  grantedPrivileges: LicensePrivilege[];
  name: string;

  constructor(
    grantedPrivileges: LicensePrivilege[],
    featureFlag: ILicenseFeatureFlag,
    name: string
  ) {
    this.featureFlag = featureFlag;
    this.grantedPrivileges = grantedPrivileges;
    this.name = name;
  }
}
