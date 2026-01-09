import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IRole } from './role.interface';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoleSet } from '../role-set/role.set.entity';
import { RoleName } from '@common/enums/role.name';
import { IContributorRolePolicy } from './contributor.role.policy.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

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

  @Column('jsonb', { nullable: false })
  credential!: ICredentialDefinition;

  @Column('jsonb', { nullable: false })
  parentCredentials!: ICredentialDefinition[];

  @Column('boolean', { nullable: false })
  requiresEntryRole!: boolean;

  @Column('boolean', { nullable: false })
  requiresSameRoleInParentRoleSet!: boolean;

  @Column('jsonb', { nullable: false })
  userPolicy!: IContributorRolePolicy;

  @Column('jsonb', { nullable: false })
  organizationPolicy!: IContributorRolePolicy;

  @Column('jsonb', { nullable: false })
  virtualContributorPolicy!: IContributorRolePolicy;
}
