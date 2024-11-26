import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credental.based.credential.type';
import { ILicensingCredentialBasedPolicyCredentialRule } from './licensing.credential.based.policy.rule.credential.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

export class LicensingCredentialBasedPolicyCredentialRule
  implements ILicensingCredentialBasedPolicyCredentialRule
{
  credentialType: LicensingCredentialBasedCredentialType;
  grantedEntitlements: LicenseEntitlementType[];
  name: string;

  constructor(
    grantedEntitlements: LicenseEntitlementType[],
    credentialType: LicensingCredentialBasedCredentialType,
    name: string
  ) {
    this.credentialType = credentialType;
    this.grantedEntitlements = grantedEntitlements;
    this.name = name;
  }
}
