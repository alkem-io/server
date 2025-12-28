import { Column, Entity } from 'typeorm';
import { ILicensePolicy } from './license.policy.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine';

@Entity()
export class LicensePolicy
  extends AuthorizableEntity
  implements ILicensePolicy
{
  @Column('jsonb', { nullable: false })
  credentialRules: ILicensingCredentialBasedPolicyCredentialRule[] = [];
}
