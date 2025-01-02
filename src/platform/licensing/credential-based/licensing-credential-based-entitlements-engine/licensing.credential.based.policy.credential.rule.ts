import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ILicensingCredentialBasedPolicyCredentialRule } from './licensing.credential.based.policy.credential.rule.interface';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';

export class LicensingCredentialBasedPolicyCredentialRule
  implements ILicensingCredentialBasedPolicyCredentialRule
{
  credentialType: LicensingCredentialBasedCredentialType;
  grantedEntitlements: LicensingGrantedEntitlement[];
  name: string;

  constructor(
    grantedEntitlements: LicensingGrantedEntitlement[],
    credentialType: LicensingCredentialBasedCredentialType,
    name: string
  ) {
    this.credentialType = credentialType;
    this.grantedEntitlements = grantedEntitlements;
    this.name = name;
  }
}
