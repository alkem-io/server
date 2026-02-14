import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine/licensing.credential.based.policy.credential.rule.interface';
import { ILicensePolicy } from './license.policy.interface';

export class LicensePolicy
  extends AuthorizableEntity
  implements ILicensePolicy
{
  credentialRules: ILicensingCredentialBasedPolicyCredentialRule[] = [];
}
