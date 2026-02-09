import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { License } from '../license/license.entity';
import { ILicenseEntitlement } from './license.entitlement.interface';

@Entity()
export class LicenseEntitlement
  extends BaseAlkemioEntity
  implements ILicenseEntitlement
{
  @ManyToOne(
    () => License,
    license => license.entitlements,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  license?: License;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: LicenseEntitlementType;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataType!: LicenseEntitlementDataType;

  @Column('int', { nullable: false })
  limit!: number;

  @Column('boolean', { nullable: false })
  enabled!: boolean;
}
