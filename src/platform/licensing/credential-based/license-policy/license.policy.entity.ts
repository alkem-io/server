import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine/licensing.credential.based.policy.credential.rule.interface';
import { ILicensePolicy } from './license.policy.interface';

@Entity()
export class LicensePolicy
  extends AuthorizableEntity
  implements ILicensePolicy
{
  @Column('jsonb', { nullable: false })
  credentialRules: ILicensingCredentialBasedPolicyCredentialRule[] = [];
}
