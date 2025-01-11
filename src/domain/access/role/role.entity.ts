import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IRole } from './role.interface';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoleSet } from '../role-set/role.set.entity';
import { RoleName } from '@common/enums/role.name';

@Entity()
export class Role extends BaseAlkemioEntity implements IRole {
  @ManyToOne(() => RoleSet, roleSet => roleSet.roles, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  roleSet?: RoleSet;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  name!: RoleName;

  @Column('text', { nullable: false })
  credential!: string;

  @Column('text', { nullable: false })
  parentCredentials!: string;

  @Column('boolean', { nullable: false })
  requiresEntryRole!: boolean;

  @Column('boolean', { nullable: false })
  requiresSameRoleInParentRoleSet!: boolean;

  @Column('text', { nullable: false })
  userPolicy!: string;

  @Column('text', { nullable: false })
  organizationPolicy!: string;

  @Column('text', { nullable: false })
  virtualContributorPolicy!: string;
}
