import { Column, Entity, ManyToOne } from 'typeorm';
import { IEntitlement } from './entitlement.interface';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { License } from '../license/license.entity';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';

@Entity()
export class Entitlement extends BaseAlkemioEntity implements IEntitlement {
  @ManyToOne(() => License, license => license.entitlements, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  license?: License;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataType!: string;

  @Column('int', { nullable: false })
  limit!: number;

  @Column('boolean', { nullable: false })
  enabled!: boolean;
}