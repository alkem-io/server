import { ILicensePolicyRuleFeatureFlag } from './license.policy.rule.feature.flag.interface';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';

export class LicensePolicyRuleFeatureFlag
  implements ILicensePolicyRuleFeatureFlag
{
  featureFlagName: LicenseFeatureFlagName;
  grantedPrivileges: LicensePrivilege[];
  name: string;

  constructor(
    grantedPrivileges: LicensePrivilege[],
    featureFlag: LicenseFeatureFlagName,
    name: string
  ) {
    this.featureFlagName = featureFlag;
    this.grantedPrivileges = grantedPrivileges;
    this.name = name;
  }
}
