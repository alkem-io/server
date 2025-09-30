import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ILicensingCredentialBasedPolicyCredentialRule } from './licensing.credential.based.policy.credential.rule.interface';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';

export class LicensingCredentialBasedPolicyCredentialRule
  implements ILicensingCredentialBasedPolicyCredentialRule
{
  id: string;
  credentialType: LicensingCredentialBasedCredentialType;
  grantedEntitlements: LicensingGrantedEntitlement[];
  name: string;

  constructor(
    id: string,
    grantedEntitlements: LicensingGrantedEntitlement[],
    credentialType: LicensingCredentialBasedCredentialType,
    name: string
  ) {
    this.id = id;
    this.credentialType = credentialType;
    this.grantedEntitlements = grantedEntitlements;
    this.name = name;
  }
}
