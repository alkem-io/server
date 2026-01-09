import { Column, Entity } from 'typeorm';
import { ILicensePolicy } from './license.policy.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine/licensing.credential.based.policy.credential.rule.interface';

@Entity()
export class LicensePolicy
  extends AuthorizableEntity
  implements ILicensePolicy
{
  @Column('jsonb', { nullable: false })
  credentialRules: ILicensingCredentialBasedPolicyCredentialRule[] = [];
}
