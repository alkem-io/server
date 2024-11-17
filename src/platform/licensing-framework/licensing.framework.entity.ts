import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ILicensingFramework } from './licensing.framework.interface';
import { LicensePolicy } from '@platform/license-policy/license.policy.entity';
import { LicensePlan } from '@platform/license-plan/license.plan.entity';

@Entity()
export class LicensingFramework
  extends AuthorizableEntity
  implements ILicensingFramework
{
  @OneToMany(() => LicensePlan, licensePlan => licensePlan.licensingFramework, {
    eager: true,
    cascade: true,
  })
  plans!: LicensePlan[];

  @OneToOne(() => LicensePolicy, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licensePolicy!: LicensePolicy;
}
