import { Column, Entity, OneToMany } from 'typeorm';
import { ILicense } from './license.interface';
import { ENUM_LENGTH } from '@common/constants';
import { AuthorizableEntity } from '../entity/authorizable-entity';
import { Entitlement } from '../license-entitlement/entitlement.entity';
import { LicenseType } from '@common/enums/license.type';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @OneToMany(() => Entitlement, entitlement => entitlement.license, {
    eager: false,
    cascade: true,
  })
  entitlements?: Entitlement[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: LicenseType;
}
