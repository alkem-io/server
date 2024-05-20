import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ILicensing } from './licensing.interface';
import { LicensePolicy } from '@platform/license-policy/license.policy.entity';
import { LicensePlan } from '@platform/license-plan/license.plan.entity';

@Entity()
export class Licensing extends AuthorizableEntity implements ILicensing {
  @OneToMany(() => LicensePlan, licensePlan => licensePlan.licensing, {
    eager: true,
    cascade: true,
  })
  plans?: LicensePlan[];

  @OneToOne(() => LicensePolicy, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licensePolicy!: LicensePolicy;
}
