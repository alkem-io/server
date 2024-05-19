import { Column, Entity, ManyToOne } from 'typeorm';
import { ILicensePlan } from './license.plan.interface';
import { LicenseManager } from '@platform/license-manager/license.manager.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

@Entity()
export class LicensePlan extends BaseAlkemioEntity implements ILicensePlan {
  @ManyToOne(() => LicenseManager, licenseManager => licenseManager.plans, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  licenseManager?: LicenseManager;

  @Column('text', { nullable: false })
  name!: string;

  @Column('boolean', { nullable: false })
  enabled!: boolean;
}
