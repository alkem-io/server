import { Column, Entity, ManyToOne } from 'typeorm';
import { ILicensePlan } from './license.plan.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Licensing } from '@platform/licensing/licensing.entity';

@Entity()
export class LicensePlan extends BaseAlkemioEntity implements ILicensePlan {
  @ManyToOne(() => Licensing, licensing => licensing.plans, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  licensing?: Licensing;

  @Column('text', { nullable: false })
  name!: string;

  @Column('boolean', { nullable: false, default: true })
  enabled!: boolean;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerMonth!: number;

  @Column('boolean', { nullable: false, default: false })
  isFree!: boolean;

  @Column('boolean', { nullable: false, default: false })
  trialEnabled!: boolean;

  @Column('boolean', { nullable: false, default: false })
  requiresPaymentMethod!: boolean;

  @Column('boolean', { nullable: false, default: false })
  requiresContactSupport!: boolean;
}
