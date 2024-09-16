import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IRole } from './role.interface';
import { CommunityRoleType } from '@common/enums/community.role';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoleSet } from '../role-set/role.set.entity';

@Entity()
export class Role extends BaseAlkemioEntity implements IRole {
  @ManyToOne(() => RoleSet, manager => manager.roles, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  roleSet?: RoleSet;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: CommunityRoleType;

  @Column('text', { nullable: false })
  credential!: string;

  @Column('text', { nullable: false })
  parentCredentials!: string;

  @Column('boolean', { nullable: false })
  requiresBaseRole!: boolean;

  @Column('boolean', { nullable: false })
  requiresParentRole!: boolean;

  @Column('text', { nullable: false })
  userPolicy!: string;

  @Column('text', { nullable: false })
  organizationPolicy!: string;

  @Column('text', { nullable: false })
  virtualContributorPolicy!: string;
}
