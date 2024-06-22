import { Column, Entity } from 'typeorm';
import { ILicensePolicy } from './license.policy.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class LicensePolicy
  extends AuthorizableEntity
  implements ILicensePolicy
{
  @Column('text')
  featureFlagRules: string;

  constructor() {
    super();
    this.featureFlagRules = '';
  }
}
