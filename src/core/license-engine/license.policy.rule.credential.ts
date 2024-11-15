import { LicenseCredential } from '@common/enums/license.credential';
import { ILicensePolicyCredentialRule } from './license.policy.rule.credential.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

export class LicensePolicyCredentialRule
  implements ILicensePolicyCredentialRule
{
  credentialType: LicenseCredential;
  grantedEntitlements: LicenseEntitlementType[];
  name: string;

  constructor(
    grantedEntitlements: LicenseEntitlementType[],
    credentialType: LicenseCredential,
    name: string
  ) {
    this.credentialType = credentialType;
    this.grantedEntitlements = grantedEntitlements;
    this.name = name;
  }
}
