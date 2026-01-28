import { ENUM_LENGTH } from '@common/constants';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { LicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { ILicensePlan } from './license.plan.interface';

@Entity()
export class LicensePlan extends BaseAlkemioEntity implements ILicensePlan {
  @ManyToOne(
    () => LicensingFramework,
    licensing => licensing.plans,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  licensingFramework?: LicensingFramework;

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

  @Column('text', { nullable: false })
  licenseCredential!: LicensingCredentialBasedCredentialType;

  @Column('varchar', { nullable: false, length: ENUM_LENGTH })
  type!: LicensingCredentialBasedPlanType;

  @Column('boolean', { nullable: false, default: false })
  assignToNewOrganizationAccounts!: boolean;

  @Column('boolean', { nullable: false, default: false })
  assignToNewUserAccounts!: boolean;
}
