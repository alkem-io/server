import { ENUM_LENGTH } from '@common/constants';
import { LicenseType } from '@common/enums/license.type';
import { Column, Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '../entity/authorizable-entity';
import { LicenseEntitlement } from '../license-entitlement/license.entitlement.entity';
import { ILicense } from './license.interface';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @OneToMany(
    () => LicenseEntitlement,
    entitlement => entitlement.license,
    {
      eager: false,
      cascade: true,
    }
  )
  entitlements?: LicenseEntitlement[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: LicenseType;
}
