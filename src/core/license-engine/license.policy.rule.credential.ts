import { LicenseCredential } from '@common/enums/license.credential';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { ILicensePolicyCredentialRule } from './license.policy.rule.credential.interface';

export class LicensePolicyCredentialRule
  implements ILicensePolicyCredentialRule
{
  credentialType: LicenseCredential;
  grantedPrivileges: LicensePrivilege[];
  name: string;

  constructor(
    grantedPrivileges: LicensePrivilege[],
    credentialType: LicenseCredential,
    name: string
  ) {
    this.credentialType = credentialType;
    this.grantedPrivileges = grantedPrivileges;
    this.name = name;
  }
}
